import {currentSupabaseUser,craftRoom} from '@/lib/supabase/server';
import {mergeAvailability} from '@/features/when-we-meet/availability-changes.mjs';
import {normalizeResponses} from '@/features/when-we-meet/normalize.mjs';
import {body,failed,invalid,ok,sameOrigin,unauthorized,uuid} from '../http';
export const dynamic='force-dynamic';
type Context={params:Promise<{roomId:string}>};
export async function GET(_request:Request,context:Context){const {roomId}=await context.params;if(!uuid(roomId)){return invalid('Invalid room ID.');}try{const context=await currentSupabaseUser();if(!context.user){return unauthorized();}const result=await craftRoom(roomId,context);return result?ok(result):failed('Room unavailable or you are not a member.',403)}catch{return failed('Could not load room.')}}
const validSlots=(value:unknown):value is string[]=>Array.isArray(value)&&value.length<=672&&value.every(s=>typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s))&&new Set(value).size===value.length;
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return failed('Invalid request origin.',403);
 const {roomId}=await context.params;if(!uuid(roomId))return invalid('Invalid room ID.');
 const input=await body(request,64*1024);if(!input)return invalid();
 // Owner-only meeting rename; the RPC re-checks ownership, trims and bounds the title.
 if(input.action==='rename'){
  const title=typeof input.title==='string'?input.title.trim():'';
  if(!title||title.length>100||/[\u0000-\u001f\u007f]/.test(title))return invalid('Enter a meeting name (1–100 characters).');
  try{
   const {client,user}=await currentSupabaseUser();if(!user)return unauthorized();
   const {data,error}=await client.rpc('wwm_rename_room',{p_room_id:roomId,p_title:title});
   if(error)return error.code==='42501'?failed('Only the meeting owner can rename it.',403):error.code==='22023'?invalid('Enter a meeting name (1–100 characters).'):failed('Could not rename the meeting.',502);
   return ok({title:typeof data==='string'?data:title});
  }catch{return failed('Could not rename the meeting.')}
 }
 const {action,name}=input;if(typeof name!=='string'||!name.trim()||name.trim().length>50)return invalid('Enter your name.');
 try{
  const {client,user}=await currentSupabaseUser();if(!user)return unauthorized();
  if(action==='join'){
   if(!uuid(input.token))return invalid('Invalid invitation token.');
   const {data,error}=await client.rpc('wwm_join_room',{p_room_id:roomId,p_token:input.token,p_name:name.trim()});
   return error?failed('Could not join this invitation.',400):data?ok({joined:true}):failed('Invalid room invitation.',403);
  }
  if(action!=='save')return invalid('Invalid action.');
  if(!validSlots(input.slots))return invalid('Invalid availability slots.');
  const base=input.base as {name?:unknown;slots?:unknown}|undefined;
  // A stale full-array client must refresh instead of silently overwriting edits.
  if(!base||typeof base.name!=='string'||!validSlots(base.slots))return failed('Refresh this meeting before saving; your selection is still on this device.',409);
  const desired={name:name.trim(),slots:input.slots};
  for(let attempt=0;attempt<4;attempt++){
   const {data:row,error:readError}=await client.from('wwm_responses').select('user_id,display_name,slots,updated_at').eq('room_id',roomId).eq('user_id',user.id).single();
   if(readError||!row)return failed('Your response was not found. Reopen the invitation.',403);
   const [current]=normalizeResponses([row]);
   const merged=mergeAvailability({name:current.displayName,slots:current.slots},desired,{name:base.name,slots:base.slots});
   if(!validSlots(merged.slots))return invalid('Too many selected times.');
   const {data,error}=await client.from('wwm_responses').update({display_name:merged.name,slots:merged.slots}).eq('room_id',roomId).eq('user_id',user.id).eq('updated_at',current.updatedAt).select('user_id,display_name,slots,updated_at');
   if(error)return failed('Could not save availability. Your changes remain on this device.',400);
   if(data?.length){const [saved]=normalizeResponses(data);return ok({saved:true,value:{name:saved.displayName,slots:saved.slots,version:saved.updatedAt}});}
  }
  return failed('Another edit arrived while saving. Retry to merge your changes.',409);
 }catch{return failed('Could not update room.')}
}
