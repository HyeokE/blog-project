import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {serverSupabaseClient} from '@/lib/supabase/server';
import {createLoginExchange} from '@/features/when-we-meet/calendar-login.mjs';
import {fetchCalendarIdentity} from '@/features/when-we-meet/calendar-server.mjs';
import {encryptCredential} from '@/features/when-we-meet/calendar-connection.mjs';
import {storeCredential} from '@/features/when-we-meet/calendar-db';
import {body,failed,invalid,ok,sameOrigin} from '../../when-we-meet/http';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function POST(request:Request){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const input=await body(request);
 if(typeof input?.code!=='string'||!/^[\w-]{8,2048}$/.test(input.code))return invalid('Invalid authorization code.');
 try{
  const store=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw Error('Authentication unavailable');
  // SIGNED_IN flushes provider-bearing sessions. This first adapter NEVER writes cookies.
  const discarded:{name:string;value:string;options?:Record<string,unknown>}[]=[];
  const staged=createServerClient(url,key,{cookies:{getAll(){return store.getAll()},setAll(values){discarded.push(...values)}}});
  const result=await createLoginExchange({client:staged,createClient:()=>serverSupabaseClient(),identity:{code:input.code,fetchIdentity:fetchCalendarIdentity},scope:undefined,persist:async ({userId,subject,email,refreshToken}:{userId:string;subject:string;email:string;refreshToken:string})=>{
   const encryptionKey=process.env.WWM_CALENDAR_ENCRYPTION_KEY;
   if(!encryptionKey)throw Error('Calendar unavailable');
   const cipher=encryptCredential({refresh_token:refreshToken},encryptionKey,`credential:${userId}:${subject}`);
   await storeCredential(userId,subject,email,cipher);
  }});
  for(const item of discarded.filter(item=>item.name.endsWith('-code-verifier')&&!item.value))store.set(item.name,'',{maxAge:0,httpOnly:true,path:'/'});
  return ok(result);
 }catch{return failed('Could not complete Google login.',400)}
}
