// Google Calendar attendee replies → room members. Pure. Runs on the server for the owner only:
// emails are matched here and dropped, so the response carries member ids and statuses alone.
export const RSVP_STATUSES=Object.freeze(['accepted','declined','tentative','needsAction']);
const key=email=>typeof email==='string'?email.trim().toLowerCase():'';

/** Event + [{userId,email}] → [{userId,response}] for members found on the event, or null when the event has no attendee list. */
export function rsvpByMember(event,members){
 if(!event||!Array.isArray(event.attendees)||!event.attendees.length)return null;
 const byEmail=new Map(event.attendees.map(row=>[key(row?.email),row]));
 const rows=[];
 for(const member of members){
  const match=key(member.email)&&byEmail.get(key(member.email));
  if(!match)continue;
  rows.push({userId:member.userId,response:RSVP_STATUSES.includes(match.responseStatus)?match.responseStatus:'needsAction'});
 }
 return rows;
}

/** Counts per status (all four keys present). */
export function rsvpCounts(rows){
 const counts={accepted:0,declined:0,tentative:0,needsAction:0};
 for(const row of rows)if(row&&row.response in counts)counts[row.response]+=1;
 return counts;
}
