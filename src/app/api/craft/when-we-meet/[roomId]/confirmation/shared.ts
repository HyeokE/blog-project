import 'server-only';
import type {User} from '@supabase/supabase-js';
import {currentSupabaseUser,craftRoomMetadata} from '@/lib/supabase/server';
import {calendarAccessToken} from '@/features/when-we-meet/calendar-access';
import {readCredential} from '@/features/when-we-meet/calendar-db';
import {getEvent} from '@/features/when-we-meet/calendar-google.mjs';
import {confirmationEventId} from '@/features/when-we-meet/confirmation-foundation.mjs';
import {rsvpByMember} from '@/features/when-we-meet/rsvp.mjs';
import {normalizeAttendees,normalizeConfirmation,normalizeConfirmationDetail,normalizeRecipientFlag} from '@/features/when-we-meet/normalize.mjs';
import {failed} from '../../http';

export type Session=Awaited<ReturnType<typeof currentSupabaseUser>>;
const privateHeaders={'Cache-Control':'private, no-store'};

export async function attendees(session:Session,roomId:string){
 const {data,error}=await session.client.rpc('wwm_confirmation_attendees',{p_room_id:roomId});
 if(error)throw Error('Attendees unavailable');
 return normalizeAttendees(data||[]);
}
export async function calendarConnected(user:User){
 const subject=user.identities?.find(identity=>identity.provider==='google')?.id;
 return subject?Boolean(await readCredential(user.id,subject).catch(()=>null)):false;
}
export async function confirmationStatus(session:Session,roomId:string){
 const {data,error}=await session.client.rpc('wwm_confirmation_status',{p_room_id:roomId});
 if(error)throw Error('Status unavailable');
 return normalizeConfirmation(data?.[0]);
}
/** Member-safe: is the caller a recipient of the current confirmed meeting? Null (unknown) when the RPC is unavailable (migration not applied yet) or fails. */
export async function recipientFlag(session:Session,roomId:string){
 const {data,error}=await session.client.rpc('wwm_confirmation_is_recipient',{p_room_id:roomId});
 return error?null:normalizeRecipientFlag(data);
}
/** Owner-only edit/resend details. Null when unavailable (e.g. the revisions migration is not applied yet): the UI then hides Edit/Resend. */
export async function confirmationDetail(session:Session,roomId:string){
 const {data,error}=await session.client.rpc('wwm_confirmation_owner_detail',{p_room_id:roomId});
 if(error)return null;
 return normalizeConfirmationDetail(data?.[0]);
}
/** Signed-in owner of an existing room, or the error response to return. */
export async function ownerSession(roomId:string,action:string):Promise<{session:Session;user:User;room:NonNullable<Awaited<ReturnType<typeof craftRoomMetadata>>>['room']}|{response:Response}>{
 const session=await currentSupabaseUser();const user=session.user;
 if(!user)return {response:Response.json({error:'Sign in with Google to continue.'},{status:401,headers:privateHeaders})};
 const metadata=await craftRoomMetadata(roomId,session);
 if(!metadata)return {response:failed('Meeting unavailable or you are not a member.',403)};
 if(metadata.room.ownerId!==user.id)return {response:failed(`Only the meeting owner can ${action}.`,403)};
 return {session,user,room:metadata.room};
}
/** Organizer access token, or the reconnect response. */
export async function organizerToken(user:User,message:string):Promise<{token:string}|{response:Response}>{
 try{return {token:await calendarAccessToken(user)};}
 catch(error){if((error as {reconnect?:boolean}).reconnect)return {response:Response.json({error:message,reconnect:true},{status:409,headers:privateHeaders})};throw error;}
}
/** Owner-only attendee replies read from the confirmed Google event with the owner's own token.
 * Emails are matched here and never returned. Best effort: a missing/expired token, a slow or failed read → null (the UI omits RSVP). */
export async function ownerRsvp(user:User,roomId:string,members:Array<{userId:string;email:string|null}>){
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const read=(async()=>rsvpByMember(await getEvent(await calendarAccessToken(user),confirmationEventId(roomId,1)),members))();
  const timeout=new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),4000)});
  return await Promise.race([read.catch(()=>null),timeout]);
 }catch{return null}
 finally{clearTimeout(timer)}
}
