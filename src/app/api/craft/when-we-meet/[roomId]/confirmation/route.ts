import type {User} from '@supabase/supabase-js';
import {currentSupabaseUser,craftRoomMetadata} from '@/lib/supabase/server';
import {calendarAccessToken} from '@/features/when-we-meet/calendar-access';
import {readCredential,finalizeConfirmation} from '@/features/when-we-meet/calendar-db';
import {getEvent,insertEvent} from '@/features/when-we-meet/calendar-google.mjs';
import {validateConfirmation,confirmationEventId,confirmationFingerprint} from '@/features/when-we-meet/confirmation-foundation.mjs';
import {confirmMeeting} from '@/features/when-we-meet/confirmation-flow.mjs';
import {normalizeAttendees,normalizeConfirmation} from '@/features/when-we-meet/normalize.mjs';
import {body,failed,invalid,ok,sameOrigin,unauthorized,uuid} from '../../http';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{roomId:string}>};
type Session=Awaited<ReturnType<typeof currentSupabaseUser>>;

async function attendees(session:Session,roomId:string){
 const {data,error}=await session.client.rpc('wwm_confirmation_attendees',{p_room_id:roomId});
 if(error)throw Error('Attendees unavailable');
 return normalizeAttendees(data||[]);
}
async function calendarConnected(user:User){
 const subject=user.identities?.find(identity=>identity.provider==='google')?.id;
 return subject?Boolean(await readCredential(user.id,subject).catch(()=>null)):false;
}
async function confirmationStatus(session:Session,roomId:string){
 const {data,error}=await session.client.rpc('wwm_confirmation_status',{p_room_id:roomId});
 if(error)throw Error('Status unavailable');
 return normalizeConfirmation(data?.[0]);
}

// Members see the public status; the owner also receives the attendee review (names + login emails).
export async function GET(_request:Request,context:Context){
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid room ID.');
 try{
  const session=await currentSupabaseUser();if(!session.user)return unauthorized();
  const metadata=await craftRoomMetadata(roomId,session);
  if(!metadata)return failed('Room unavailable or you are not a member.',403);
  const confirmation=await confirmationStatus(session,roomId);
  if(metadata.room.ownerId!==session.user.id)return ok({confirmation,review:null});
  const [rows,connected]=await Promise.all([attendees(session,roomId),calendarConnected(session.user)]);
  return ok({confirmation,review:{calendarConnected:connected,organizerEmail:session.user.email??null,attendees:rows.map(row=>({userId:row.userId,name:row.displayName,email:row.email,hasAvailability:row.hasAvailability,isOrganizer:row.userId===session.user!.id}))}});
 }catch{return failed('Could not load the confirmation.');}
}

// Owner-only, explicit action: sends Google Calendar invitations to the reviewed recipients.
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid room ID.');
 const input=await body(request);if(!input)return invalid();
 try{
  const session=await currentSupabaseUser();const user=session.user;if(!user)return unauthorized();
  const metadata=await craftRoomMetadata(roomId,session);
  if(!metadata)return failed('Room unavailable or you are not a member.',403);
  if(metadata.room.ownerId!==user.id)return failed('Only the meeting owner can confirm.',403);
  const members=(await attendees(session,roomId)).map(row=>({userId:row.userId,email:row.email}));
  let valid;
  try{valid=validateConfirmation({roomId,revision:1,title:input.title,date:input.date,start:input.start,end:input.end,recipients:input.recipients,excluded:input.excluded,optional:input.optional},metadata.room,members);}
  catch{return invalid('The proposed time or recipients changed. Review again.');}
  let accessToken:string;
  try{accessToken=await calendarAccessToken(user);}
  catch(error){if((error as {reconnect?:boolean}).reconnect)return Response.json({error:'Connect Google Calendar to send invitations.',reconnect:true},{status:409,headers:{'Cache-Control':'private, no-store'}});throw error;}
  const eventId=confirmationEventId(roomId,1),payloadHash=confirmationFingerprint(valid);
  const result=await confirmMeeting({valid,eventId,
   reserve:async()=>{
    const {data,error}=await session.client.rpc('wwm_reserve_confirmation',{p_room_id:roomId,p_revision:1,p_payload_hash:payloadHash,p_google_event_id:eventId,p_title:valid.title,p_starts_at:valid.start,p_ends_at:valid.end,p_recipients:valid.recipients.map((r:{userId:string})=>r.userId),p_excluded:valid.excluded});
    if(error)throw Error(`Reservation failed: ${error.code??''} ${error.message}`);
    return data as string;
   },
   getEvent:(id:string)=>getEvent(accessToken,id),
   insertEvent:(event:Record<string,unknown>)=>insertEvent(accessToken,event),
   finalize:(status:'confirmed'|'reconciling'|'released',url?:string)=>finalizeConfirmation(roomId,user.id,eventId,payloadHash,status,url??null)
  });
  if(result.status==='conflict')return failed('This meeting was already confirmed with different details.',409);
  if(result.status==='failed')return failed('Google Calendar rejected the invitation. Nothing was sent.',502);
  return ok({...result,confirmation:await confirmationStatus(session,roomId)});
 }catch(error){console.warn('[wwm] confirmation failed:',error instanceof Error?error.message:'unknown');return failed('Could not confirm the meeting. Try again to check the invitation status.',502);}
}
