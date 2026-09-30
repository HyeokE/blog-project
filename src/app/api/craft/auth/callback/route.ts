import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {serverSupabaseClient} from '@/lib/supabase/server';
import {createLoginExchange} from '@/features/when-we-meet/calendar-login.mjs';
import {body,failed,invalid,ok,sameOrigin} from '../../when-we-meet/http';
export const dynamic='force-dynamic';export const runtime='nodejs';
// Plain sign-in only: Calendar credentials are written solely by the direct Calendar consent callback.
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
  const result=await createLoginExchange({client:staged,createClient:()=>serverSupabaseClient(),code:input.code});
  for(const item of discarded.filter(item=>item.name.endsWith('-code-verifier')&&!item.value))store.set(item.name,'',{maxAge:0,httpOnly:true,path:'/'});
  return ok(result);
 }catch{return failed('Could not complete Google login.',400)}
}
