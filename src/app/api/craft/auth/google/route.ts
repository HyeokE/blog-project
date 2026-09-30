import {serverSupabaseClient} from '@/lib/supabase/server';
import {requestOrigin} from '@/lib/request-origin.mjs';
import {safeReturnPath} from '@/features/when-we-meet/return-path.mjs';
export const dynamic='force-dynamic';
function callbackOrigin(request:Request){return requestOrigin(request.headers)??new URL(request.url).origin}
export async function GET(request:Request){try{const url=new URL(request.url);const callback=new URL('/craft/when-we-meet/auth/callback',callbackOrigin(request));callback.searchParams.set('next',safeReturnPath(url.searchParams.get('next')));const client=await serverSupabaseClient();const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:callback.toString(),scopes:'https://www.googleapis.com/auth/calendar.events.owned',queryParams:{access_type:'offline',prompt:'consent'}}});if(error||!data.url){return Response.json({error:'Google login unavailable.'},{status:503})}return Response.redirect(data.url,303)}catch{return Response.json({error:'Google login unavailable.'},{status:503})}}
