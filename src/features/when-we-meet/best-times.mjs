// "Best times" for the Confirm tab. Pure: saved responses only, never the unsaved draft.
// A window is a run of consecutive half-hours on one room-local date where the same members are
// available; it is capped at `maxSlots` from its start so a suggestion is a meeting, not a day.
const HALF_HOUR=30*60*1000;
const minutes=clock=>Number(clock.slice(0,2))*60+Number(clock.slice(3));
const clock=total=>`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;

/**
 * Top windows by available member count (ties → earlier start). Only `members` count; slots come from
 * the room (makeSlots), so the room's dates and hours bound every window. Windows shorter than
 * `minSlots` half-hours or with nobody available are dropped.
 */
export function bestTimes({slots,responses,members,limit=3,minSlots=1,maxSlots=4}){
 const memberIds=new Set(members.map(member=>member.id));
 const saved=new Map(members.map(member=>[member.id,new Set(responses.find(row=>row.userId===member.id)?.slots||[])]));
 const ordered=[...slots].sort((a,b)=>Date.parse(a.id)-Date.parse(b.id));
 const who=slot=>members.filter(member=>saved.get(member.id).has(slot.id)).map(member=>member.id);
 const windows=[];
 let run=null;
 const close=()=>{if(run&&run.ids.length>=minSlots&&run.available.length>0)windows.push(run);run=null};
 for(const slot of ordered){
  const available=who(slot),key=available.join('|');
  const continues=run&&run.date===slot.date&&run.key===key&&Date.parse(slot.id)-Date.parse(run.ids.at(-1))===HALF_HOUR;
  if(continues){run.ids.push(slot.id);run.last=slot;continue}
  close();
  run={date:slot.date,key,available,ids:[slot.id],first:slot,last:slot};
 }
 close();
 return windows
  .map(window=>{
   const ids=window.ids.slice(0,maxSlots),last=ordered.find(slot=>slot.id===ids.at(-1));
   return {date:window.date,start:window.first.time,end:clock(minutes(last.time)+30),startId:ids[0],endId:ids.at(-1),count:window.available.length,total:memberIds.size,missing:members.filter(member=>!window.available.includes(member.id)).map(member=>member.name)};
  })
  .sort((a,b)=>b.count-a.count||Date.parse(a.startId)-Date.parse(b.startId))
  .slice(0,limit);
}
