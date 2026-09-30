// Confirm tab adapter: API payload to ConfirmationPanel props. Pure; no fetch, no clocks.
// Room-local wall clocks are converted through makeSlots ids (never ad hoc offset math).
import {rangeFields,rangeInstants,rangeSlotIds} from './confirm-selection.mjs';
import {formatCraftInstant} from './display-date.mjs';

const HALF_HOUR=30*60*1000;
const minutes=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
const clock=total=>`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
const isString=value=>typeof value==='string';
const fail=message=>{throw new Error(message)};

function normalizeRecord(value){
 if(value===null||value===undefined)return null;
 if(typeof value!=='object'||!isString(value.status)||!isString(value.startsAt)||!isString(value.endsAt)||!isString(value.timezone))fail('Invalid confirmation');
 return {status:value.status,title:isString(value.title)?value.title:'',startsAt:value.startsAt,endsAt:value.endsAt,timezone:value.timezone,googleEventUrl:isString(value.googleEventUrl)?value.googleEventUrl:null,...(Number.isSafeInteger(value.revision)?{revision:value.revision}:{})};
}
const idList=value=>{if(!Array.isArray(value)||!value.every(isString))fail('Invalid confirmation edit');return [...value];};
/** Owner-only edit detail (ids only; addresses stay in the attendee review). Null when the server has none. */
function normalizeEdit(value){
 if(value===null||value===undefined)return null;
 if(typeof value!=='object'||!Number.isSafeInteger(value.revision)||value.revision<1)fail('Invalid confirmation edit');
 const open=value.open;
 if(open!==null&&open!==undefined&&(typeof open!=='object'||!Number.isSafeInteger(open.revision)||!isString(open.status)||!isString(open.startsAt)||!isString(open.endsAt)))fail('Invalid confirmation edit');
 return {revision:value.revision,recipientIds:idList(value.recipientIds),excludedIds:idList(value.excludedIds),optionalIds:idList(value.optionalIds),
  open:open?{revision:open.revision,status:open.status,title:isString(open.title)?open.title:'',startsAt:open.startsAt,endsAt:open.endsAt,recipientIds:idList(open.recipientIds),excludedIds:idList(open.excludedIds),optionalIds:idList(open.optionalIds)}:null,
  lastResentAt:isString(value.lastResentAt)?value.lastResentAt:null};
}
function normalizeReview(value){
 if(value===null||value===undefined)return null;
 if(typeof value!=='object'||!Array.isArray(value.attendees))fail('Invalid confirmation review');
 return {calendarConnected:value.calendarConnected===true,organizerEmail:isString(value.organizerEmail)&&value.organizerEmail?value.organizerEmail:null,attendees:value.attendees.map(row=>{
  if(!row||!isString(row.userId)||!isString(row.name))fail('Invalid attendee');
  return {userId:row.userId,name:row.name,email:isString(row.email)&&row.email?row.email:null,hasAvailability:row.hasAvailability===true,isOrganizer:row.isOrganizer===true};
 }),edit:normalizeEdit(value.edit)};
}
/** Validates the (already camelCase) API payload; the server's row normalizer owns the snake_case conversion. */
export function normalizeConfirmationResponse(raw){
 if(!raw||typeof raw!=='object')fail('Invalid confirmation response');
 return {confirmation:normalizeRecord(raw.confirmation),review:normalizeReview(raw.review)};
}

/** Room-local date + HH:mm range → UTC instants. End = last covered slot + 30 min, so 24:00 is the next local midnight.
 * Calendar selections also carry slot ids; they win over the wall clock (a repeated DST half-hour) but must agree with it. */
export function proposalInstants({date,start,end,startId,endId},slots){
 if(startId||endId){
  const range={date,startId,endId},fields=rangeFields(slots,range);
  if(!fields||!rangeSlotIds(slots,range).length||fields.date!==date||fields.start!==start||fields.end!==end||Date.parse(endId)<Date.parse(startId))fail('The selected time changed. Review again.');
  return rangeInstants(range);
 }
 if(!isString(date)||!/^\d\d:\d\d$/.test(start||'')||!/^\d\d:\d\d$/.test(end||'')||minutes(end)<=minutes(start))fail('Choose a valid time range.');
 const first=slots.find(slot=>slot.date===date&&slot.time===start);
 const last=slots.findLast(slot=>slot.date===date&&slot.time===clock(minutes(end)-30));
 if(!first||!last||Date.parse(last.utc)<Date.parse(first.utc))fail('That time is outside the meeting window.');
 return {start:new Date(Date.parse(first.utc)).toISOString(),end:new Date(Date.parse(last.utc)+HALF_HOUR).toISOString()};
}

/** POST body; recipients + excluded must partition every attendee exactly once. */
export function confirmationBody({title,proposal,slots,attendeeIds}){
 const recipients=[...proposal.recipientIds],excluded=[...proposal.excludedIds],all=[...recipients,...excluded];
 if(!recipients.length||new Set(all).size!==all.length||all.length!==attendeeIds.length||attendeeIds.some(id=>!all.includes(id)))fail('Recipients changed. Review again.');
 const {start,end}=proposalInstants(proposal,slots);
 const eventTitle=(proposal.title??title).trim();
 if(!eventTitle||eventTitle.length>100)fail('Enter an event name (up to 100 characters).');
 const optional=[...new Set(proposal.optionalIds||[])].filter(id=>recipients.includes(id));
 return {title:eventTitle,date:proposal.date,start,end,recipients,excluded,optional};
}

function localClock(iso,timezone,slots,edge){
 const at=Date.parse(iso);
 if(edge==='start'){const slot=slots.find(item=>Date.parse(item.utc)===at);if(slot)return {date:slot.date,time:slot.time};}
 else{const slot=slots.find(item=>Date.parse(item.utc)===at-HALF_HOUR);if(slot)return {date:slot.date,time:clock(minutes(slot.time)+30)};}
 const [day,time]=formatCraftInstant(iso,timezone).split(' ');
 return {date:day.replaceAll('.','-'),time};
}

const panelStatus=status=>status==='confirmed'?'confirmed':status==='pending'||status==='reconciling'?'reconciling':status==='failed'?'failed':'draft';

/** API data → ConfirmationPanel props (minus room/callbacks). recipientIds, when known from this session, narrows attendee names. */
export function confirmPanelState({data,slots,organizerName,recipientIds}){
 const review=data.review,record=data.confirmation;
 const attendees=review?.attendees||[];
 const status=record?panelStatus(record.status):'draft';
 const state={
  role:review?'owner':'member',
  members:attendees.map(row=>({id:row.userId,name:row.name,...(row.email?{email:row.email}:{}),response:row.hasAvailability?'available':'not-responded'})),
  organizerEmail:review?.organizerEmail||undefined,
  calendar:review?.calendarConnected?'connected':'disconnected',
  status,
 };
 if(status==='failed')state.error='The last confirmation attempt did not finish. Review the details and try again.';
 if(record&&status==='confirmed'){
  const start=localClock(record.startsAt,record.timezone,slots,'start'),end=localClock(record.endsAt,record.timezone,slots,'end');
  const edit=review?.edit;
  const shown=edit?edit.recipientIds:recipientIds;
  const names=(shown?attendees.filter(row=>shown.includes(row.userId)):attendees).map(row=>row.name);
  state.confirmation={title:record.title,date:start.date,start:start.time,end:end.time,timezone:record.timezone,organizer:attendees.find(row=>row.isOrganizer)?.name||organizerName||'Organizer',attendeeNames:names,...((record.revision??1)>1?{updated:true}:{}),...(record.googleEventUrl?{eventUrl:record.googleEventUrl}:{})};
  // Edit review starts from the confirmed snapshot; members who joined since then start excluded.
  if(edit)state.edit={baseRevision:edit.revision,initial:{title:record.title,date:start.date,start:start.time,end:end.time,excludedIds:attendees.map(row=>row.userId).filter(id=>!edit.recipientIds.includes(id)),optionalIds:edit.optionalIds.filter(id=>edit.recipientIds.includes(id))},status:edit.open?'reconciling':'idle',lastResentAt:edit.lastResentAt};
 }
 return state;
}

/** 200 POST result → panel status plus the refreshed record. */
export function confirmOutcome(result){
 return {status:result?.status==='confirmed'?'confirmed':'reconciling',confirmation:normalizeRecord(result?.confirmation??null)};
}

/** POST failure → panel status. retrySame: resending the same proposal is safe and useful (server reconciles, never double-sends). */
export function confirmFailure(error){
 const status=error&&typeof error.status==='number'?error.status:undefined;
 const message=error&&typeof error.message==='string'&&status!==undefined?error.message:'';
 if(status===409&&error.reconnect===true)return {status:'failed',calendar:'disconnected',error:`${message||'Connect Google Calendar to send invitations.'} Connecting does not send anything; review again afterward.`,retrySame:false};
 if(status===400)return {status:'failed',error:message||'The proposed time or recipients changed. Review again.',retrySame:false};
 if(status===403)return {status:'failed',error:message||'Only the meeting owner can confirm.',retrySame:false};
 if(status===409)return {status:'failed',error:message||'This meeting was already confirmed with different details.',retrySame:false};
 if(status===401)return {status:'failed',error:'Your session expired. Sign in again, then review.',retrySame:false};
 return {status:'failed',error:message||'Could not reach the server. Try again to check the invitation status; it will not send twice.',retrySame:true};
}

/** Edit POST body: the reviewed proposal plus the confirmed revision it was edited from. */
export function confirmUpdateBody({baseRevision,...input}){
 if(!Number.isSafeInteger(baseRevision)||baseRevision<1)fail('Reload the meeting and review again.');
 return {...confirmationBody(input),baseRevision};
}

/** The server's open (pending/reconciling) edit as the exact body to re-POST: the server reconciles it by read-back. */
export function openEditBody(data,slots){
 const open=data?.review?.edit?.open,record=data?.confirmation;
 if(!open||!record)return null;
 const day=localClock(open.startsAt,record.timezone,slots,'start').date;
 return {title:open.title,date:day,start:open.startsAt,end:open.endsAt,recipients:[...open.recipientIds],excluded:[...open.excludedIds],optional:[...open.optionalIds],baseRevision:open.revision-1};
}

/** Resend failure → inline message at the Resend control. */
export function resendFailure(error){
 const status=error&&typeof error.status==='number'?error.status:undefined;
 const message=error&&typeof error.message==='string'&&status!==undefined?error.message:'';
 if(status===409&&error.reconnect===true)return {status:'failed',calendar:'disconnected',error:message||'Connect Google Calendar to resend invitations.'};
 if(status===401)return {status:'failed',error:'Your session expired. Sign in again.'};
 return {status:'failed',error:message||'Could not reach the server. Try again in a minute.'};
}
