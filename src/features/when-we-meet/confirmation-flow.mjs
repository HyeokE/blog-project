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
