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
export function normalizeMeeting(row,counts=new Map()){return {...normalizeRoom(row),createdAt:row.created_at,participantCount:counts.has(row.id)?counts.get(row.id):null}}
/** `updatedAt` stays the raw DB string: it is the optimistic-concurrency version compared back in SQL. */
export function normalizeResponses(rows){return rows.map(row=>({userId:row.user_id,displayName:row.display_name,slots:(row.slots||[]).map(instant),...(row.updated_at!==undefined?{updatedAt:row.updated_at}:{})}))}
export function normalizePeople(rows){return rows.map(row=>({userId:row.user_id,displayName:row.display_name,isAdmin:row.is_admin===true,hasAvailability:row.has_availability===true}))}
export function normalizeAttendees(rows){return rows.map(row=>({userId:row.user_id,displayName:row.display_name,email:row.email??null,hasAvailability:row.has_availability===true}))}
export function normalizeConfirmation(row){return row?{status:row.status,title:row.title??'',startsAt:row.starts_at,endsAt:row.ends_at,timezone:row.timezone,googleEventUrl:row.google_event_url??null}:null}
export function normalizeCreatedRoom(value){return {id:value.id,inviteToken:value.invite_token}}
export function normalizeCredential(row){return row?{googleSubject:row.google_subject,googleEmail:row.google_email,credentialCiphertext:row.credential_ciphertext}:null}
