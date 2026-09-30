import {createBrowserClient} from '@supabase/ssr';
import type {SupabaseClient} from '@supabase/supabase-js';
let client:SupabaseClient|null=null;
export function getSupabaseClient():SupabaseClient|null{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key||!/^https:\/\//.test(url)){return null;}
 if(!client){client=createBrowserClient(url,key,{auth:{flowType:'pkce',detectSessionInUrl:false}});}
 return client;
}
