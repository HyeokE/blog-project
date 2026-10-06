import {datesInRange,isCalendarDate,normalizeAvailableDates} from './date-availability.mjs';
export class DateApiProblem extends Error{constructor(message,status=500){super(message);this.status=status;}}
export const dateUuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const requireValue=(condition)=>{if(!condition)throw new DateApiProblem('Invalid date meeting data.');};
export function rawDateVersion(value){
 requireValue(typeof value==='string'&&/^\d{4}-\d\d-\d\d[T ](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)$/.test(value)&&isCalendarDate(value.slice(0,10)));
 return value;
}
export function normalizeDateRoom(row,userId){
 if(row?.schedule_mode==='time')throw new DateApiProblem('Date room required.',400);
 if(row?.schedule_mode===undefined)throw new DateApiProblem('Date mode is unavailable.',503);
 requireValue(row?.schedule_mode==='date'&&row.start_time===null&&row.end_time===null&&dateUuid(row.id)&&dateUuid(row.owner_id)&&dateUuid(userId)&&typeof row.title==='string'&&row.title.trim().length>0&&row.title.length<=100&&typeof row.timezone==='string'&&row.timezone.length<=64);
 try{datesInRange(row.start_date,row.end_date);new Intl.DateTimeFormat('en',{timeZone:row.timezone});}catch{throw new DateApiProblem('Invalid date meeting data.');}
 requireValue(row.invite_token==null||dateUuid(row.invite_token));
 return {...(row.invite_token==null?{}:{inviteToken:row.invite_token}),id:row.id,title:row.title,startDate:row.start_date,endDate:row.end_date,timezone:row.timezone,ownerId:row.owner_id,role:row.owner_id===userId?'ADMIN':'MEMBER',scheduleMode:'date',startTime:null,endTime:null};
}
export function normalizeDateResponses(rows,room){
 requireValue(Array.isArray(rows));const seen=new Set();
 return rows.map(row=>{requireValue(dateUuid(row?.user_id)&&!seen.has(row.user_id)&&typeof row.display_name==='string'&&row.display_name.trim().length>0&&row.display_name.length<=50&&Array.isArray(row.slots)&&row.slots.length===0);seen.add(row.user_id);
 let availableDates;try{availableDates=normalizeAvailableDates(row.available_dates,room);}catch{throw new DateApiProblem('Invalid date availability data.');}
 return {userId:row.user_id,displayName:row.display_name,availableDates,updatedAt:rawDateVersion(row.updated_at)};});
}
export function normalizeDateCreated(row){requireValue(dateUuid(row?.id)&&dateUuid(row.invite_token));return {id:row.id,inviteToken:row.invite_token};}
export function normalizeDateSaved(rows){requireValue(Array.isArray(rows)&&rows.length===1);return rawDateVersion(rows[0]?.updated_at);}
export function normalizeDateSchedule(rows){requireValue(Array.isArray(rows)&&rows.length===1);const row=rows[0];try{datesInRange(row.start_date,row.end_date);new Intl.DateTimeFormat('en',{timeZone:row.timezone});}catch{throw new DateApiProblem('Invalid date schedule data.');}requireValue(typeof row.timezone==='string'&&Number.isSafeInteger(row.removed_dates)&&row.removed_dates>=0);return {schedule:{startDate:row.start_date,endDate:row.end_date,timezone:row.timezone},removedDates:row.removed_dates};}
// The sole snake_case translation boundary, including database request payloads.
export const dateRoomColumns='id,owner_id,title,start_date,end_date,start_time,end_time,timezone,schedule_mode,invite_token';
export const dateResponseColumns='user_id,display_name,slots,available_dates,updated_at';
export function dateCreateParameters(input){return {p_title:input.title,p_start_date:input.startDate,p_end_date:input.endDate,p_timezone:input.timezone,p_name:input.name};}
export function dateSaveParameters(roomId,value,version){return {p_room_id:roomId,p_name:value.name,p_available_dates:value.availableDates,p_expected_updated_at:version};}
export function dateScheduleParameters(roomId,input){return {p_room_id:roomId,p_start_date:input.startDate,p_end_date:input.endDate,p_timezone:input.timezone};}
export const dateDbFields={roomId:'room_id',userId:'user_id',scheduleMode:'schedule_mode'};
