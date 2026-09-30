import {currentSupabaseUser,serverSupabaseClient} from '@/lib/supabase/server';
import {failed,ok,sameOrigin,unauthorized} from '../when-we-meet/http';
export const dynamic='force-dynamic';
export async function GET(){try{const {user}=await currentSupabaseUser();return ok({user:user?{id:user.id,email:user.email,user_metadata:user.user_metadata}:null})}catch{return failed('Could not check your account.')}}
export async function POST(request:Request){if(!sameOrigin(request)){return failed('Invalid request origin.',403)}try{const {user}=await currentSupabaseUser();if(!user){return unauthorized()}const client=await serverSupabaseClient();const {error}=await client.auth.signOut({scope:'local'});return error?failed('Could not sign out.'):ok({signedOut:true})}catch{return failed('Could not sign out.')}}
