import {buildCalendarInsert} from './confirmation-foundation.mjs';

// Google's read-back is the only proof of success; organizer rows are ignored.
export function eventMatches(event,valid){
 if(!event||event.status==='cancelled')return false;
 const same=(a,b)=>Date.parse(a)===Date.parse(b);
 if(!same(event.start?.dateTime,valid.start)||!same(event.end?.dateTime,valid.end))return false;
 const got=new Set((event.attendees||[]).filter(a=>!a.organizer&&!a.self).map(a=>String(a.email).toLowerCase()));
 const want=valid.recipients.map(r=>r.email.toLowerCase()).filter(email=>!(event.organizer?.email&&email===event.organizer.email.toLowerCase()));
 return got.size===want.length&&want.every(email=>got.has(email));
}

/**
 * Reserve → reconcile by deterministic event ID → insert once → read back → finalize.
 * Ambiguous failures stay `reconciling`; a retry reconciles instead of creating a second event.
 */
export async function confirmMeeting({valid,eventId,reserve,getEvent,insertEvent,finalize}){
 const claim=await reserve();
 if(claim==='conflict')return {status:'conflict'};
 if(claim==='existing')return {status:'confirmed'};
 let event;
 try{
  event=await getEvent(eventId);
  if(!event){
   try{event=await insertEvent({...buildCalendarInsert(valid),id:eventId});}
   catch(error){
    if(error?.status!==409){
     if(error?.definite){await finalize('released');return {status:'failed',message:error.message};}
     throw error;
    }
   }
   event=await getEvent(eventId);
  }
 }catch{
  await finalize('reconciling');
  return {status:'reconciling'};
 }
 if(!eventMatches(event,valid)){await finalize('reconciling');return {status:'reconciling'};}
 await finalize('confirmed',event.htmlLink);
 return {status:'confirmed',url:event.htmlLink};
}

// ---- Edits of a confirmed meeting (revision >= 2) and invitation resend ----

/** eventMatches plus the event title and per-attendee optional flags (edits may change only those). */
export function eventMatchesSnapshot(event,valid){
 if(!eventMatches(event,valid)||event.summary!==valid.title)return false;
 const organizer=event.organizer?.email?.toLowerCase();
 const optional=new Map((event.attendees||[]).filter(a=>!a.organizer&&!a.self).map(a=>[String(a.email).toLowerCase(),a.optional===true]));
 return valid.recipients.every(r=>r.email.toLowerCase()===organizer||optional.get(r.email.toLowerCase())===(r.optional===true));
}

/** Patch body for the existing event: new time/title, attendees replaced (Google notifies removed guests),
 * the organizer's own entry and existing RSVPs kept. */
export function buildCalendarPatch(event,valid){
 const insert=buildCalendarInsert(valid);
 const existing=new Map((event?.attendees||[]).map(a=>[String(a.email).toLowerCase(),a]));
 const own=(event?.attendees||[]).filter(a=>a.organizer||a.self);
 const ownEmails=new Set(own.map(a=>String(a.email).toLowerCase()));
 const wanted=insert.attendees.filter(a=>!ownEmails.has(a.email.toLowerCase())).map(a=>{
  const {optional:_drop,...kept}=existing.get(a.email.toLowerCase())||{};
  return {...kept,email:kept.email??a.email,...(a.optional?{optional:true}:{})};
 });
 return {summary:insert.summary,start:insert.start,end:insert.end,attendees:[...own,...wanted]};
}

/**
 * Reserve edit → read the event by its deterministic ID → patch only if Google does not already
 * hold the edit → read back → finalize. A retried edit that already applied never patches (no
 * second notification); a definite Google rejection reverts to the previous confirmed meeting;
 * anything ambiguous stays `reconciling` and the next retry reconciles from the read-back.
 */
export async function updateConfirmedMeeting({valid,eventId,reserve,getEvent,patchEvent,finalize}){
 const claim=await reserve();
 if(claim==='conflict'||claim==='not_confirmed')return {status:claim};
 if(claim==='existing')return {status:'confirmed'};
 let event;
 try{
  event=await getEvent(eventId);
  if(!event||event.status==='cancelled'){await finalize('reverted');return {status:'failed',message:'The Google Calendar event no longer exists.'};}
  if(!eventMatchesSnapshot(event,valid)){
   try{await patchEvent(eventId,buildCalendarPatch(event,valid));}
   catch(error){
    if(error?.definite){await finalize('reverted');return {status:'failed',message:error.message};}
    throw error;
   }
   event=await getEvent(eventId);
  }
 }catch{
  await finalize('reconciling');
  return {status:'reconciling'};
 }
 if(!eventMatchesSnapshot(event,valid)){await finalize('reconciling');return {status:'reconciling'};}
 await finalize('confirmed',event.htmlLink);
 return {status:'confirmed',url:event.htmlLink};
}

/**
 * Re-sends the invitation emails for the confirmed event. The Calendar API has no "resend"
 * method; guests are notified when the event is updated with sendUpdates=all
 * (https://developers.google.com/workspace/calendar/api/v3/reference/events/patch), so we bump
 * the writable iCalendar `sequence` (https://developers.google.com/workspace/calendar/api/v3/reference/events)
 * conditionally on the read ETag. Nothing else about the event changes.
 * Server-side reservation limits this to once per minute per room; only a definite rejection
 * lifts the limit, an unknown outcome lets the reservation expire.
 */
export async function resendInvitations({eventId,reserve,getEvent,patchEvent,finalize}){
 const claim=await reserve();
 if(claim!=='reserved')return {status:claim==='too_soon'?'too_soon':'not_confirmed'};
 let event;
 try{event=await getEvent(eventId);}catch{return {status:'unknown'};}
 if(!event||event.status==='cancelled'){await finalize('failed');return {status:'failed',message:'The Google Calendar event no longer exists.'};}
 try{await patchEvent(eventId,{sequence:(Number.isSafeInteger(event.sequence)?event.sequence:0)+1},event.etag);}
 catch(error){
  if(error?.definite){await finalize('failed');return {status:'failed',message:error.message};}
  return {status:'unknown'};
 }
 await finalize('sent');
 return {status:'sent'};
}
