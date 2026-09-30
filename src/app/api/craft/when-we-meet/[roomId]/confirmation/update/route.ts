import {finalizeConfirmationUpdate} from '@/features/when-we-meet/calendar-db';
import {getEvent,patchEvent} from '@/features/when-we-meet/calendar-google.mjs';
import {validateConfirmation,confirmationEventId,confirmationFingerprint} from '@/features/when-we-meet/confirmation-foundation.mjs';
import {updateConfirmedMeeting} from '@/features/when-we-meet/confirmation-flow.mjs';
import {attendees,confirmationDetail,confirmationStatus,organizerToken,ownerSession} from '../shared';
import {body,failed,invalid,ok,sameOrigin,uuid} from '../../../http';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{roomId:string}>};

// Owner-only, explicit action: edits the confirmed Google event (same event ID) and notifies attendees.
// `baseRevision` is the confirmed revision the owner edited; a retry of the same edit reconciles instead of re-sending.
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid room ID.');
 const input=await body(request);if(!input)return invalid();
 const baseRevision=input.baseRevision;
 if(typeof baseRevision!=='number'||!Number.isSafeInteger(baseRevision)||baseRevision<1)return invalid('Reload the meeting and review again.');
 try{
  const owner=await ownerSession(roomId,'edit the meeting');if('response' in owner)return owner.response;
  const {session,user,room}=owner;
  const members=(await attendees(session,roomId)).map(row=>({userId:row.userId,email:row.email}));
  let valid;
  try{valid=validateConfirmation({roomId,revision:baseRevision+1,title:input.title,date:input.date,start:input.start,end:input.end,recipients:input.recipients,excluded:input.excluded,optional:input.optional},room,members);}
  catch{return invalid('The proposed time or recipients changed. Review again.');}
  const access=await organizerToken(user,'Connect Google Calendar to update the invitation.');if('response' in access)return access.response;
  const eventId=confirmationEventId(roomId,1),payloadHash=confirmationFingerprint(valid);
  const result=await updateConfirmedMeeting({valid,eventId,
   reserve:async()=>{
    const {data,error}=await session.client.rpc('wwm_reserve_confirmation_update',{p_room_id:roomId,p_revision:valid.revision,p_payload_hash:payloadHash,p_title:valid.title,p_starts_at:valid.start,p_ends_at:valid.end,p_recipients:valid.recipients.map((r:{userId:string})=>r.userId),p_excluded:valid.excluded,p_optional:valid.recipients.filter((r:{optional:boolean})=>r.optional).map((r:{userId:string})=>r.userId)});
    if(error)throw Error(`Edit reservation failed: ${error.code??''} ${error.message}`);
    return data as string;
   },
   getEvent:(id:string)=>getEvent(access.token,id),
   patchEvent:(id:string,patch:Record<string,unknown>)=>patchEvent(access.token,id,patch),
   finalize:(status:'confirmed'|'reconciling'|'reverted',url?:string)=>finalizeConfirmationUpdate(roomId,user.id,eventId,valid.revision,payloadHash,status,url??null)
  });
  if(result.status==='conflict')return failed('This meeting changed since you opened it. Reload and review again.',409);
  if(result.status==='not_confirmed')return failed('Only a confirmed meeting can be edited.',409);
  if(result.status==='failed')return failed('Google Calendar rejected the change. The previous meeting details still stand.',502);
  const [confirmation,edit]=await Promise.all([confirmationStatus(session,roomId),confirmationDetail(session,roomId)]);
  return ok({...result,confirmation,edit});
 }catch(error){console.warn('[wwm] confirmation edit failed:',error instanceof Error?error.message:'unknown');return failed('Could not update the meeting. Try again to check the invitation status.',502);}
}
