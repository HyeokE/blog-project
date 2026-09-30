// Read-only projection of persisted responses. This module never reads editor state.
import {assignParticipantColors} from './participant-palette.mjs';
const halfHour=30*60*1000;
const endOf=slot=>new Date(Date.parse(slot.id)+halfHour).toISOString();
const compare=(a,b)=>a<b?-1:a>b?1:0;
// Natural, case-insensitive name order: Participant 2 sorts before Participant 10.
const names=new Intl.Collator('en',{numeric:true,sensitivity:'base'});

/** Room-start anchored weeks; dates are inclusive room dates, not locale weeks. */
export function weekWindow(dates,requestedWeek=0,selectedDay=null){
  if(!dates.length)return {weekIndex:0,weekCount:0,dates:[],selectedDay:null};
  const weekCount=Math.ceil(dates.length/7);
  const weekIndex=Math.max(0,Math.min(weekCount-1,Math.trunc(Number.isFinite(requestedWeek)?requestedWeek:0)));
  const visible=dates.slice(weekIndex*7,weekIndex*7+7);
  return {weekIndex,weekCount,dates:visible,selectedDay:visible.includes(selectedDay)?selectedDay:visible[0]};
}

function runsFor(slots,selected){
  const runs=[];
  for(const slot of slots){
    if(!selected.has(slot.id))continue;
    const previous=runs.at(-1);
    if(previous?.date===slot.date&&previous.endUtc===slot.id){
      previous.slotIds.push(slot.id);previous.endUtc=endOf(slot);
    }else runs.push({date:slot.date,slotIds:[slot.id],startUtc:slot.id,endUtc:endOf(slot)});
  }
  return runs;
}

/** Explicitly unsaved preview; never pass this to saved aggregate counts. */
export function projectDraftRow({slots,selectedIds,displayName}){
  const selected=new Set(selectedIds);
  return {label:displayName,unsaved:true,runs:runsFor(slots,selected)};
}

/** Responses must be normalized, unique per user and represent saved responses only. */
export function projectWeeklyTimeline({slots,responses,currentUserId,youLabel='You'}){
  const ordered=[...slots].sort((a,b)=>compare(a.id,b.id));
  const seen=new Set();
  for(const response of responses){
    if(seen.has(response.userId))throw new Error(`Duplicate response user ID: ${response.userId}`);
    seen.add(response.userId);
  }
  const sorted=[...responses].sort((a,b)=>names.compare(a.displayName,b.displayName)||compare(a.userId,b.userId));
  const nameCounts=new Map();
  for(const response of sorted){const key=response.displayName.toLocaleLowerCase();nameCounts.set(key,(nameCounts.get(key)||0)+1)}
  const nameOrdinals=new Map();
  const palette=assignParticipantColors(sorted.map(response=>response.userId),currentUserId);
  const rows=sorted.map(response=>{
    const key=response.displayName.toLocaleLowerCase();
    const ordinal=(nameOrdinals.get(key)||0)+1;nameOrdinals.set(key,ordinal);
    const isCurrentUser=response.userId===currentUserId;
    const label=nameCounts.get(key)>1?`${response.displayName} (${isCurrentUser?youLabel:ordinal})`:isCurrentUser?`${response.displayName} (${youLabel})`:response.displayName;
    const selected=new Set(response.slots);
    return {userId:response.userId,displayName:response.displayName,label,isCurrentUser,color:palette.get(response.userId).color,mark:palette.get(response.userId).mark,slotIds:ordered.filter(slot=>selected.has(slot.id)).map(slot=>slot.id),runs:runsFor(ordered,selected)};
  });
  const selectedByRow=sorted.map(response=>new Set(response.slots));
  // A saved response with no slots is "not entered yet" everywhere else (People tab, confirm review), so it is not counted.
  const responseCount=selectedByRow.filter(ids=>ids.size>0).length;
  const countById={};
  const days=[];
  for(const slot of ordered){
    const count=selectedByRow.filter(ids=>ids.has(slot.id)).length;
    countById[slot.id]=count;
    if(days.at(-1)?.date!==slot.date)days.push({date:slot.date,slots:[]});
    days.at(-1).slots.push({...slot,count,all:responseCount>0&&count===responseCount});
  }
  return {responseCount,days,rows,countById};
}
