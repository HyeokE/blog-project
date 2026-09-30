import {finalizeResend} from '@/features/when-we-meet/calendar-db';
import {getEvent,patchEvent} from '@/features/when-we-meet/calendar-google.mjs';
import {confirmationEventId} from '@/features/when-we-meet/confirmation-foundation.mjs';
import {resendInvitations} from '@/features/when-we-meet/confirmation-flow.mjs';
import {organizerToken,ownerSession} from '../shared';
import {failed,invalid,ok,sameOrigin,uuid} from '../../../http';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{roomId:string}>};

// Owner-only, explicit action: asks Google to email the confirmed event's attendees again.
// Limited server-side to once per minute per room (wwm_reserve_resend).
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid room ID.');
 try{
  const owner=await ownerSession(roomId,'resend invitations');if('response' in owner)return owner.response;
  const {session,user}=owner;
  const access=await organizerToken(user,'Connect Google Calendar to resend invitations.');if('response' in access)return access.response;
  const eventId=confirmationEventId(roomId,1);
  const result=await resendInvitations({eventId,
   reserve:async()=>{
    const {data,error}=await session.client.rpc('wwm_reserve_resend',{p_room_id:roomId});
    if(error)throw Error(`Resend reservation failed: ${error.code??''} ${error.message}`);
    return data as string;
   },
   getEvent:(id:string)=>getEvent(access.token,id),
   patchEvent:(id:string,patch:Record<string,unknown>,etag?:string)=>patchEvent(access.token,id,patch,fetch,{etag}),
   finalize:(status:'sent'|'failed')=>finalizeResend(roomId,user.id,eventId,status)
  });
  if(result.status==='sent')return ok({status:'sent'});
  if(result.status==='too_soon')return failed('Invitations were just sent. Try again in a minute.',429);
  if(result.status==='not_confirmed')return failed('Invitations can be resent only for a confirmed meeting with no pending changes.',409);
  if(result.status==='failed')return failed('Google Calendar rejected the request. Nothing was sent.',502);
  return failed('Google Calendar did not answer. Try again in a minute.',502);
 }catch(error){console.warn('[wwm] resend failed:',error instanceof Error?error.message:'unknown');return failed('Could not resend invitations. Try again in a minute.',502);}
}
