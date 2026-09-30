import {cookies} from 'next/headers';
import {currentSupabaseUser} from '@/lib/supabase/server';
import {requestOrigin} from '@/lib/request-origin.mjs';
import {storeCredential} from '@/features/when-we-meet/calendar-db';
import {calendarReturnPath,decodeFlowCookie,CALENDAR_CALLBACK_PATH,CALENDAR_FLOW_COOKIE} from '@/features/when-we-meet/calendar-connection.mjs';
import {calendarConfig,completeCalendarConnection} from '@/features/when-we-meet/calendar-server.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
// Google redirects here after Calendar consent. Verifies state, cookie, nonce, PKCE, signed-in user and
// Google subject, stores the encrypted refresh token, then returns to the room with `?calendar=<outcome>`.
// Nothing is auto-applied or sent. The one-time flow cookie is always cleared.
export async function GET(request:Request){
 const origin=requestOrigin(request.headers);
 const store=await cookies();const flowCookie=store.get(CALENDAR_FLOW_COOKIE)?.value;
 store.set(CALENDAR_FLOW_COOKIE,'',{httpOnly:true,secure:Boolean(origin?.startsWith('https:')),sameSite:'lax',path:CALENDAR_CALLBACK_PATH,maxAge:0});
 const redirect=(path:string)=>new Response(null,{status:303,headers:{Location:new URL(path,origin??new URL(request.url).origin).toString(),'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 const failure=()=>redirect(calendarReturnPath(decodeFlowCookie(flowCookie)?.roomId??null,undefined,'error'));
 if(!origin)return failure();
 try{
  const config=calendarConfig(origin);
  const {user}=await currentSupabaseUser();
  const result=await completeCalendarConnection({params:new URL(request.url).searchParams,cookie:flowCookie,user,config,store:storeCredential});
  return redirect(result.location);
 }catch{return failure()}
}
