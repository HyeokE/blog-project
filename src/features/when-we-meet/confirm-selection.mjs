import {createWwmTranslator} from '../../i18n/wwm.mjs';
const english=createWwmTranslator('en');
// Confirm-tab range selection. Pure; ranges are one room-local date plus the first and
// last selected slot ids, so a repeated DST half-hour is never re-derived from a wall clock.
const HALF_HOUR=30*60*1000;
const minutes=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
const clock=total=>`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
const dayOf=(slots,date)=>slots.filter(slot=>slot.date===date).sort((a,b)=>Date.parse(a.id)-Date.parse(b.id));

/** Anchor → target within the anchor's date; a target on another date clamps to that day's edge. */
export function dragRange(slots,anchorId,targetId){
 const anchor=slots.find(slot=>slot.id===anchorId),target=slots.find(slot=>slot.id===targetId);
 if(!anchor||!target)return null;
 const day=dayOf(slots,anchor.date);
 const edge=target.date===anchor.date?target:Date.parse(target.id)>Date.parse(anchor.id)?day.at(-1):day[0];
 const [first,last]=Date.parse(edge.id)<Date.parse(anchor.id)?[edge,anchor]:[anchor,edge];
 return {date:anchor.date,startId:first.id,endId:last.id};
}

/** Tap/keyboard selection: the first tap sets the start, the next tap on the same date sets the end. */
export function tapRange(state,slots,id){
 const slot=slots.find(item=>item.id===id);
 if(!slot)return {anchor:null,range:null};
 const anchor=state?.anchor&&slots.find(item=>item.id===state.anchor);
 if(anchor&&anchor.date===slot.date)return {anchor:null,range:dragRange(slots,anchor.id,id)};
 return {anchor:id,range:{date:slot.date,startId:id,endId:id}};
}

export function rangeSlotIds(slots,range){
 if(!range)return [];
 const from=Date.parse(range.startId),to=Date.parse(range.endId);
 return dayOf(slots,range.date).filter(slot=>Date.parse(slot.id)>=from&&Date.parse(slot.id)<=to).map(slot=>slot.id);
}

/** Range → the date/start/end fields. End is exclusive; the last 23:30 slot ends at 24:00. */
export function rangeFields(slots,range){
 if(!range)return null;
 const first=slots.find(slot=>slot.id===range.startId),last=slots.find(slot=>slot.id===range.endId);
 if(!first||!last)return null;
 return {date:range.date,start:first.time,end:clock(minutes(last.time)+30)};
}

/** Typed fields → range: first occurrence of the start, last occurrence of the end (same as proposalInstants). */
export function fieldsRange(slots,{date,start,end}){
 if(!date||!/^\d\d:\d\d$/.test(start||'')||!/^\d\d:\d\d$/.test(end||'')||minutes(end)<=minutes(start))return null;
 const day=dayOf(slots,date);
 const first=day.find(slot=>slot.time===start),last=day.findLast(slot=>slot.time===clock(minutes(end)-30));
 if(!first||!last||Date.parse(last.id)<Date.parse(first.id))return null;
 return {date,startId:first.id,endId:last.id};
}

export function rangeInstants(range){
 return {start:new Date(Date.parse(range.startId)).toISOString(),end:new Date(Date.parse(range.endId)+HALF_HOUR).toISOString()};
}

/** Each member's saved availability for the selected slots. Not responded = no saved slots at all;
 * partial names the covered time when it is one contiguous run. Without a selection, members pass through. */
export function selectionAvailability(members,responses,slots,range,t=english){
 const ids=rangeSlotIds(slots,range);
 if(!ids.length)return members;
 const byId=new Map(slots.map(slot=>[slot.id,slot]));
 return members.map(member=>{
  const saved=new Set(responses.find(row=>row.userId===member.id)?.slots||[]);
  const {availability:_previous,...rest}=member;
  if(!saved.size)return {...rest,response:'not-responded'};
  const covered=ids.map(id=>saved.has(id));
  if(covered.every(Boolean))return {...rest,response:'available'};
  if(!covered.some(Boolean))return {...rest,response:'unavailable'};
  const first=covered.indexOf(true),last=covered.lastIndexOf(true);
  const contiguous=covered.slice(first,last+1).every(Boolean);
  const label=contiguous?t('confirm.status.availableBetween',{range:`${byId.get(ids[first]).time}–${clock(minutes(byId.get(ids[last]).time)+30)}`}):t('confirm.status.partial');
  return {...rest,response:'partial',availability:label};
 });
}

/** True when a member who was fully available for the chosen time (at selection) no longer is (saved availability changed). */
export function selectionDrift(previous,current){
 if(!previous||!current)return false;
 const now=new Map(current.map(member=>[member.id,member.response]));
 return previous.some(member=>member.response==='available'&&now.has(member.id)&&now.get(member.id)!=='available');
}
