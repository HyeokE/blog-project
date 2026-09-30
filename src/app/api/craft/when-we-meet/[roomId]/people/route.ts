import {currentSupabaseUser} from '@/lib/supabase/server';
import {uuid,invalid,unauthorized,failed,ok} from '../../http';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{roomId:string}>}){
 const {roomId}=await params;
 if(!uuid(roomId))return invalid('Invalid room ID.');
 try{
  const {client,user}=await currentSupabaseUser();
  if(!user)return unauthorized();
  const {data,error}=await client.rpc('wwm_room_people',{p_room_id:roomId});
  if(error)return failed('Room unavailable or you are not a member.',403);
  return ok({people:data||[]});
 }catch{return failed('Could not load participants.');}
}
