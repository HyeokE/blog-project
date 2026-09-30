import {createHash} from 'node:crypto';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const instant=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const date=/^\d{4}-\d\d-\d\d$/;
const time=/^(?:[01]\d|2[0-3]):(?:00|30)$/;
const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3));
const fail=()=>{throw new Error('Invalid confirmation snapshot or proposed interval');};
const local=(iso,zone)=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(p=>[p.type,p.value]));
export function validateConfirmation(proposal,room,members){
 if(!room||!uuid.test(room.id)||proposal?.roomId!==room.id||!date.test(proposal.date)||!date.test(room.startDate)||!date.test(room.endDate)||proposal.date<room.startDate||proposal.date>room.endDate||!time.test(room.startTime)||!(time.test(room.endTime)||room.endTime==='24:00')||!Number.isSafeInteger(proposal.revision)||proposal.revision<1||typeof proposal.title!=='string'||!proposal.title.trim()||proposal.title.length>100)fail();
 if(!instant.test(proposal.start)||!instant.test(proposal.end)||!Number.isFinite(Date.parse(proposal.start))||!Number.isFinite(Date.parse(proposal.end))||new Date(proposal.start).toISOString()!==proposal.start||new Date(proposal.end).toISOString()!==proposal.end)fail();
 const start=Date.parse(proposal.start),end=Date.parse(proposal.end);
 if(start>=end||end-start>86400000||!Array.isArray(members)||!members.length||!Array.isArray(proposal.recipients)||!proposal.recipients.length||!Array.isArray(proposal.excluded??[]))fail();
 const startLocal=local(proposal.start,room.timezone),endLocal=local(proposal.end,room.timezone);
 const day=proposal.date, next=new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
 const startClock=`${startLocal.hour}:${startLocal.minute}`,endClock=`${endLocal.hour}:${endLocal.minute}`;
 if(`${startLocal.year}-${startLocal.month}-${startLocal.day}`!==day||`${endLocal.year}-${endLocal.month}-${endLocal.day}`!==day&&!(room.endTime==='24:00'&&`${endLocal.year}-${endLocal.month}-${endLocal.day}`===next&&endClock==='00:00')||startLocal.second!=='00'||endLocal.second!=='00'||!time.test(startClock)||!(time.test(endClock)||endClock==='00:00')||minutes(startClock)<minutes(room.startTime)||minutes(startClock)>=minutes(room.endTime)||minutes(endClock)>minutes(room.endTime)&&`${endLocal.year}-${endLocal.month}-${endLocal.day}`===day)fail();
 // Offset transitions cannot turn a chronological meeting into a backwards wall-clock range.
 if(`${endLocal.year}-${endLocal.month}-${endLocal.day}`===day&&minutes(endClock)<=minutes(startClock))fail();
 const ids=members.map(m=>m.userId),recipients=proposal.recipients,excluded=proposal.excluded??[];
 if(new Set(ids).size!==ids.length||ids.some(id=>!uuid.test(id))||new Set(recipients).size!==recipients.length||new Set(excluded).size!==excluded.length||recipients.length+excluded.length!==ids.length||new Set([...recipients,...excluded]).size!==ids.length||[...recipients,...excluded].some(id=>!ids.includes(id)))fail();
 const optional=proposal.optional??[];
 if(!Array.isArray(optional)||new Set(optional).size!==optional.length||optional.some(id=>!recipients.includes(id)))fail();
 const selected=members.filter(m=>recipients.includes(m.userId)).map(m=>({userId:m.userId,email:typeof m.email==='string'?m.email.trim():'',optional:optional.includes(m.userId)}));
 if(selected.some(m=>! /^[^\s@\x00-\x1f\x7f]+@[^\s@.\x00-\x1f\x7f]+(?:\.[^\s@.\x00-\x1f\x7f]+)+$/.test(m.email))||new Set(selected.map(m=>m.email.toLowerCase())).size!==selected.length)fail();
 return Object.freeze({roomId:room.id,date:day,start:proposal.start,end:proposal.end,timezone:room.timezone,title:proposal.title.trim(),revision:proposal.revision,recipients:selected,excluded:[...excluded].sort()});
}
export function buildCalendarInsert(valid){return {summary:valid.title,start:{dateTime:valid.start,timeZone:valid.timezone},end:{dateTime:valid.end,timeZone:valid.timezone},attendees:valid.recipients.map(({email,optional})=>optional?{email,optional:true}:{email}),guestsCanSeeOtherGuests:false,guestsCanInviteOthers:false,guestsCanModify:false};}
export function confirmationFingerprint(valid){return createHash('sha256').update(JSON.stringify({...valid,recipients:[...valid.recipients].sort((a,b)=>a.userId.localeCompare(b.userId))})).digest('hex');}
export function confirmationEventId(roomId,revision){if(!uuid.test(roomId)||!Number.isSafeInteger(revision)||revision<1)fail();return createHash('sha256').update(`wwm-confirmation-v1:${roomId}:${revision}`).digest('hex').replace(/[a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));}
export function claimDecision(existing,hash){if(!existing)return 'reserve';if(existing.payloadHash!==hash)return 'conflict';return existing.status==='confirmed'?'existing':'reconcile';}
