import {randomBytes} from 'node:crypto';
import {cookies} from 'next/headers';
import {currentSupabaseUser,craftRoomMetadata} from '@/lib/supabase/server';
import {requestOrigin} from '@/lib/request-origin.mjs';
import {createConnection,encodeFlowCookie,CALENDAR_CALLBACK_PATH,CALENDAR_FLOW_COOKIE} from '@/features/when-we-meet/calendar-connection.mjs';
import {calendarConfig} from '@/features/when-we-meet/calendar-server.mjs';
import {body,failed,invalid,ok,sameOrigin,unauthorized,uuid} from '../../../http';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{roomId:string}>};
// Direct Google consent for Calendar (not via Supabase) so the redirect URI is on our own verified domain.
// Returns Google's authorization URL; the PKCE verifier and browser nonce stay in an httpOnly cookie
// scoped to the callback path. Connecting never applies availability or sends invitations.
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid meeting ID.');
 const input=await body(request);const returnTo=typeof input?.returnTo==='string'?input.returnTo:undefined;
 const origin=requestOrigin(request.headers);if(!origin)return failed('Invalid request origin.',403);
 let config:ReturnType<typeof calendarConfig>;
 try{config=calendarConfig(origin)}catch{return failed('Google Calendar is unavailable here.',503)}
 try{
  const session=await currentSupabaseUser();const {user}=session;if(!user)return unauthorized();
  if(!await craftRoomMetadata(roomId,session))return failed('Meeting unavailable or you are not a member.',403);
  const nonce=randomBytes(32).toString('base64url');
  const flow=createConnection({roomId,userId:user.id,key:config.stateKey,origin,nonce,clientId:config.clientId,loginHint:user.email,returnTo});
  (await cookies()).set(CALENDAR_FLOW_COOKIE,encodeFlowCookie({nonce,verifier:flow.verifier,roomId}),{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:CALENDAR_CALLBACK_PATH,maxAge:600});
  return ok({authorizationUrl:flow.authorizationUrl});
 }catch{return failed('Google Calendar connection unavailable.',503)}
}
