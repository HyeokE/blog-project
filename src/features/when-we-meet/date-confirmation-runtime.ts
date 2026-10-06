import 'server-only';
import {currentSupabaseUser} from '@/lib/supabase/server';
import {isSameOrigin} from '@/lib/request-origin.mjs';
import {isCalendarDate,nextCalendarDate} from './date-availability.mjs';
import {dateRoomColumns,normalizeDateRoom,DateApiProblem} from './date-normalize.mjs';
import {normalizeAttendees} from './normalize.mjs';
import {normalizeDateConfirmationOwner} from './date-confirmation-persistence.mjs';
import {calendarAccessToken} from './calendar-access';
import {getEvent,insertEvent,patchEvent} from './calendar-google.mjs';
import {finalizeConfirmation,finalizeConfirmationUpdate,finalizeResend} from './calendar-db';
import type {DateConfirmationDependencies} from './date-confirmation-service.mjs';
type Session=Awaited<ReturnType<typeof currentSupabaseUser>>;
const apiError=(error:{code?:string}|null)=>{if(!error){return;}const code=error.code;throw new DateApiProblem('Date confirmation unavailable.', ['42703','42883','PGRST202','PGRST204'].includes(code??'')?503:['42501','P0002','PGRST116'].includes(code??'')?403:code==='22023'?400:code==='40001'?409:500);};
function memberStatus(data:unknown){
 if(data===null){return null;}
 if(!data||typeof data!=='object'||Array.isArray(data)){throw new DateApiProblem('Invalid status.',500);}
 const r=data as Record<string,unknown>;
 if(r.schedule_mode!=='date'||r.starts_at!==null||r.ends_at!==null||!Number.isSafeInteger(r.revision)||!['pending','confirmed','reconciling'].includes(String(r.status))||typeof r.title!=='string'||typeof r.start_date!=='string'||typeof r.end_date!=='string'||typeof r.timezone!=='string'){throw new DateApiProblem('Invalid status.',500);}
 if(!isCalendarDate(r.start_date)||nextCalendarDate(r.start_date as string)!==r.end_date||(r.revision as number)<1||!r.title.trim()||r.title!==r.title.trim()||r.title.length>100||/[\x00-\x1f\x7f-\x9f]/.test(r.title)||/^[+-]/.test(r.timezone)){throw new DateApiProblem('Invalid status.',500);}
 try{new Intl.DateTimeFormat('en',{timeZone:r.timezone});}catch{throw new DateApiProblem('Invalid status.',500);}
 if(r.status==='confirmed'&&(typeof r.google_event_url!=='string'||!/^https:\/\/www\.google\.com\/calendar\//.test(r.google_event_url))){throw new DateApiProblem('Invalid status.',500);}
 return {revision:r.revision as number,status:r.status as 'pending'|'confirmed'|'reconciling',scheduleMode:'date' as const,title:r.title,startDate:r.start_date,endDate:r.end_date,timezone:r.timezone,url:r.status==='confirmed'&&typeof r.google_event_url==='string'?r.google_event_url:null};
}
/** Overrides support isolated tests; production uses signed user/RLS + private DB finalizers. */
export function createDateConfirmationRuntime(overrides:{fetcher?:typeof fetch;patchEvent?:typeof patchEvent}={}):DateConfirmationDependencies<Session>{
 const fetcher=overrides.fetcher??fetch,patch=overrides.patchEvent??patchEvent;
 return {
 sameOrigin:request=>isSameOrigin(request.headers),currentUser:currentSupabaseUser,
 async loadRoom(session,roomId){const {data,error}=await session.client.from('wwm_rooms').select(dateRoomColumns).eq('id',roomId).single();apiError(error);if(!data||!session.user){throw new DateApiProblem('Meeting access required.',403);}return normalizeDateRoom(data,session.user.id);},
 async loadOwner(session,roomId,userId){const {data,error}=await session.client.rpc('wwm_date_confirmation_owner_detail',{p_room_id:roomId});apiError(error);return normalizeDateConfirmationOwner(data,roomId,userId);},
 async loadStatus(session,roomId){const {data,error}=await session.client.rpc('wwm_date_confirmation_status',{p_room_id:roomId});apiError(error);return memberStatus(data);},
 async attendees(session,roomId){const {data,error}=await session.client.rpc('wwm_confirmation_attendees',{p_room_id:roomId});apiError(error);if(!Array.isArray(data)){throw new DateApiProblem('Attendees unavailable.',500);}return normalizeAttendees(data);},
 async token(session){if(!session.user){throw new DateApiProblem('Sign in required.',401);}return calendarAccessToken(session.user);},
 async reserve(session,mode,valid,eventId,hash){const args=mode==='resend'?{p_room_id:valid.roomId}:{p_room_id:valid.roomId,p_revision:valid.revision,p_payload_hash:hash,p_title:valid.title,p_start_date:valid.startDate,p_end_date:valid.endDate,p_recipient_ids:valid.recipients.map(x=>x.userId),p_excluded_ids:[...valid.excluded],p_optional_ids:valid.recipients.filter(x=>x.optional).map(x=>x.userId),...(mode==='initial'?{p_event_id:eventId}:{})};const {data,error}=await session.client.rpc(mode==='initial'?'wwm_reserve_date_confirmation':mode==='update'?'wwm_reserve_date_confirmation_update':'wwm_reserve_resend',args);apiError(error);if(typeof data!=='string'){throw new DateApiProblem('Invalid reservation.',500);}return data;},
 getEvent:(_session,token,id)=>getEvent(token,id,fetcher),
 insertEvent:(_session,token,body)=>insertEvent(token,body,fetcher),
 patchEvent:(_session,token,id,body,etag)=>patch(token,id,body,fetcher,{etag}),
 async finalize(session,mode,valid,id,status,url,hash){if(!session.user){throw new DateApiProblem('Sign in required.',401);}
 if(mode==='initial'&&['confirmed','reconciling','released'].includes(status)){return finalizeConfirmation(valid.roomId,session.user.id,id,hash,status as 'confirmed'|'reconciling'|'released',url);}
 if(mode==='update'&&['confirmed','reconciling','reverted'].includes(status)){return finalizeConfirmationUpdate(valid.roomId,session.user.id,id,valid.revision,hash,status as 'confirmed'|'reconciling'|'reverted',url);}
 if(mode==='resend'&&['sent','failed'].includes(status)){return finalizeResend(valid.roomId,session.user.id,id,status as 'sent'|'failed');}
 throw new DateApiProblem('Invalid finalization.',500);
 }
 };
}
