import {currentSupabaseUser} from '@/lib/supabase/server';
import {readCredential} from '@/features/when-we-meet/calendar-db';
import {calendarStatus} from '@/features/when-we-meet/calendar-server.mjs';
import {failed,invalid,ok,unauthorized,uuid} from '../../../http';
export const dynamic='force-dynamic';export const runtime='nodejs';
type Context={params:Promise<{roomId:string}>};
export async function GET(_request:Request,context:Context){
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid room ID.');
 try{
  const {user}=await currentSupabaseUser();if(!user)return unauthorized();
  const subject=user.identities?.find(identity=>identity.provider==='google')?.id;
  return ok(calendarStatus(subject?await readCredential(user.id,subject):null));
 }catch{return failed('Calendar status unavailable.',503);}
}
