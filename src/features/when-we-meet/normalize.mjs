// Data-access boundary: raw Supabase/pg rows (snake_case) → app shapes (camelCase).
// This is the only place those column names are translated; routes and components never read snake_case keys.
const clock=value=>String(value).slice(0,5);
const instant=value=>new Date(value).toISOString();
export function normalizeRoom(row){
 const room={id:row.id,title:row.title,startDate:row.start_date,endDate:row.end_date,startTime:clock(row.start_time),endTime:clock(row.end_time),timezone:row.timezone};
 if(row.owner_id!==undefined)room.ownerId=row.owner_id;
 if(row.invite_token!==undefined)room.inviteToken=row.invite_token;
 return room;
}
/** `wwm_participant_counts` rows → room id → count. */
export function participantCountsByRoom(rows){return new Map((rows||[]).map(row=>[row.room_id,Number(row.participant_count)]))}
/** Per-room `wwm_confirmation_status` results → room id → status (`null` = not confirmed yet). Rooms whose read failed (`null` rows) are left out. */
export function confirmationStatusByRoom(entries){return new Map((entries||[]).filter(([,rows])=>Array.isArray(rows)).map(([roomId,rows])=>[roomId,rows[0]?.status??null]))}
export function normalizeMeeting(row,counts=new Map(),statuses=new Map()){return {...normalizeRoom(row),createdAt:row.created_at,participantCount:counts.has(row.id)?counts.get(row.id):null,confirmationStatus:statuses.get(row.id)??null}}
/** `updatedAt` stays the raw DB string: it is the optimistic-concurrency version compared back in SQL. */
export function normalizeResponses(rows){return rows.map(row=>({userId:row.user_id,displayName:row.display_name,slots:(row.slots||[]).map(instant),...(row.updated_at!==undefined?{updatedAt:row.updated_at}:{})}))}
export function normalizePeople(rows){return rows.map(row=>({userId:row.user_id,displayName:row.display_name,isAdmin:row.is_admin===true,hasAvailability:row.has_availability===true}))}
export function normalizeAttendees(rows){return rows.map(row=>({userId:row.user_id,displayName:row.display_name,email:row.email??null,hasAvailability:row.has_availability===true}))}
export function normalizeConfirmation(row){return row?{status:row.status,title:row.title??'',startsAt:row.starts_at,endsAt:row.ends_at,timezone:row.timezone,googleEventUrl:row.google_event_url??null,...(row.revision!==undefined&&row.revision!==null?{revision:Number(row.revision)}:{})}:null}
/** `wwm_confirmation_is_recipient` scalar → true/false; anything else (RPC missing or failed) → null = unknown. */
export function normalizeRecipientFlag(value){return value===true||value===false?value:null}
/** Owner-only `wwm_confirmation_owner_detail` row → edit review ids, the open edit (if any) and the last resend. */
export function normalizeConfirmationDetail(row){
 if(!row)return null;
 const ids=value=>Array.isArray(value)?value.map(String):[];
 const open=row.open_revision===null||row.open_revision===undefined?null:{revision:Number(row.open_revision),status:row.open_status,title:row.open_title??'',startsAt:instant(row.open_starts_at),endsAt:instant(row.open_ends_at),recipientIds:ids(row.open_recipient_ids),excludedIds:ids(row.open_excluded_ids),optionalIds:ids(row.open_optional_ids)};
 return {revision:Number(row.revision),recipientIds:ids(row.recipient_ids),excludedIds:ids(row.excluded_ids),optionalIds:ids(row.optional_ids),open,lastResentAt:row.last_resent_at?instant(row.last_resent_at):null};
}
export function normalizeCreatedRoom(value){return {id:value.id,inviteToken:value.invite_token}}
export function normalizeCredential(row){return row?{googleSubject:row.google_subject,googleEmail:row.google_email,credentialCiphertext:row.credential_ciphertext}:null}
/** `wwm_invitation_preview` result (first row) → the pre-sign-in invitation context; null when the token did not match. */
export function normalizeInvitationPreview(value){
 const row=Array.isArray(value)?value[0]:value;
 if(!row||typeof row.title!=='string'||typeof row.start_date!=='string'||typeof row.end_date!=='string'||typeof row.timezone!=='string')return null;
 return {title:row.title,startDate:row.start_date,endDate:row.end_date,timezone:row.timezone,organizerName:typeof row.organizer_name==='string'&&row.organizer_name?row.organizer_name:null};
}
