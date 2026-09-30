import {serverSupabaseClient} from '@/lib/supabase/server';
import {safeReturnPath} from '@/features/when-we-meet/return-path.mjs';
export const dynamic='force-dynamic';
function callbackOrigin(request:Request){
 const host=request.headers.get('x-forwarded-host')||request.headers.get('host')||'';
 if(host==='macmini-home.taile6a871.ts.net:8446'||host==='macmini-home.taile6a871.ts.net'){return 'https://macmini-home.taile6a871.ts.net:8446';}
 if(host==='localhost:3002'||host==='127.0.0.1:3002'){return `http://${host}`;}
 return new URL(request.url).origin;
}
export async function GET(request:Request){try{const url=new URL(request.url);const callback=new URL('/craft/when-we-meet/auth/callback',callbackOrigin(request));callback.searchParams.set('next',safeReturnPath(url.searchParams.get('next')));const client=await serverSupabaseClient();const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.toString(),scopes:'https://www.googleapis.com/auth/calendar.events.owned https://www.googleapis.com/auth/calendar.events.freebusy',queryParams:{access_type:'offline',prompt:'consent'}}});if(error||!data.url){return Response.json({error:'Google login unavailable.'},{status:503})}return Response.redirect(data.url,303)}catch{return Response.json({error:'Google login unavailable.'},{status:503})}}
