import {currentSupabaseUser,ownedCraftMeetings} from '@/lib/supabase/server';
import {body,failed,invalid,ok,sameOrigin,unauthorized} from './http';
import {validateRoom} from '@/features/when-we-meet/domain.mjs';
import {creationErrors} from '@/features/when-we-meet/creation-validation.mjs';
import {normalizeCreatedRoom} from '@/features/when-we-meet/normalize.mjs';
export const dynamic='force-dynamic';
export async function GET(){try{const context=await currentSupabaseUser();if(!context.user){return unauthorized();}return ok(await ownedCraftMeetings(context))}catch{return failed('Could not load meetings.')}}
export async function POST(request:Request){
 if(!sameOrigin(request)){return failed('Invalid request origin.',403)}
 const input=await body(request);if(!input){return invalid()}
 const {title,timezone,name,startDate,endDate,startTime,endTime}=input;
 if(typeof title!=='string'||typeof name!=='string'||!name.trim()||name.length>50||typeof startDate!=='string'||typeof endDate!=='string'||typeof startTime!=='string'||typeof endTime!=='string'||typeof timezone!=='string'||timezone.length>80){return invalid()}
 const problem=validateRoom({title,startDate,endDate,startTime,endTime,timezone});if(problem){return invalid(problem)}
 const errors=creationErrors({title,startDate,endDate,timezone,name},new Date());if(Object.keys(errors).length){return invalid(Object.values(errors)[0])}
 try{const {client,user}=await currentSupabaseUser();if(!user){return unauthorized()}
 const {data,error}=await client.rpc('wwm_create_room',{p_title:title,p_start_date:startDate,p_end_date:endDate,p_start_time:startTime,p_end_time:endTime,p_timezone:timezone,p_name:name});
 return error?failed(error.message,400):ok(normalizeCreatedRoom(data))}catch{return failed('Could not create room.')}
}
