import 'server-only';
import type {User} from '@supabase/supabase-js';
import {currentSupabaseUser,craftRoomMetadata} from '@/lib/supabase/server';
import {calendarAccessToken} from '@/features/when-we-meet/calendar-access';
import {readCredential} from '@/features/when-we-meet/calendar-db';
import {normalizeAttendees,normalizeConfirmation,normalizeConfirmationDetail} from '@/features/when-we-meet/normalize.mjs';
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
 if(!metadata)return {response:failed('Room unavailable or you are not a member.',403)};
 if(metadata.room.ownerId!==user.id)return {response:failed(`Only the meeting owner can ${action}.`,403)};
 return {session,user,room:metadata.room};
}
/** Organizer access token, or the reconnect response. */
export async function organizerToken(user:User,message:string):Promise<{token:string}|{response:Response}>{
 try{return {token:await calendarAccessToken(user)};}
 catch(error){if((error as {reconnect?:boolean}).reconnect)return {response:Response.json({error:message,reconnect:true},{status:409,headers:privateHeaders})};throw error;}
}
