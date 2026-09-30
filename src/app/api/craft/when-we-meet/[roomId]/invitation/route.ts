import {serverSupabaseClient} from '@/lib/supabase/server';
import {normalizeInvitationPreview} from '@/features/when-we-meet/normalize.mjs';
import {body,failed,invalid,ok,sameOrigin,uuid} from '../../http';
export const dynamic='force-dynamic';
type Context={params:Promise<{roomId:string}>};
/**
 * Pre-sign-in invitation context. Token-gated by `wwm_invitation_preview` (anon or signed in): returns only
 * {title,startDate,endDate,timezone,organizerName}. The token travels in the POST body, never the URL/logs.
 * A wrong token and an unknown room look the same (404).
 */
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid meeting ID.');
 const input=await body(request,1024);if(!input||!uuid(input.token))return invalid('Invalid invitation token.');
 try{
  const client=await serverSupabaseClient({readOnly:true});
  const {data,error}=await client.rpc('wwm_invitation_preview',{p_room_id:roomId,p_token:input.token});
  if(error)return failed('Could not load the invitation.',502);
  const preview=normalizeInvitationPreview(data);
  return preview?ok({preview}):failed('Invitation not found.',404);
 }catch{return failed('Could not load the invitation.')}
}
