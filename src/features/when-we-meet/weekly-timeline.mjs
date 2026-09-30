// Read-only projection of persisted responses. This module never reads editor state.
const palette=['#2563eb','#dc2626','#059669','#9333ea','#b45309','#0891b2','#be185d','#4f46e5'];
const halfHour=30*60*1000;
const endOf=slot=>new Date(Date.parse(slot.id)+halfHour).toISOString();
const hashId=id=>{let hash=2166136261;for(const char of id){hash=Math.imul(hash^char.codePointAt(0),16777619)}return hash>>>0};
const compare=(a,b)=>a<b?-1:a>b?1:0;

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
export function projectWeeklyTimeline({slots,responses,currentUserId}){
  const ordered=[...slots].sort((a,b)=>compare(a.id,b.id));
  const seen=new Set();
  for(const response of responses){
    if(seen.has(response.user_id))throw new Error(`Duplicate response user ID: ${response.user_id}`);
    seen.add(response.user_id);
  }
  const sorted=[...responses].sort((a,b)=>compare(a.display_name.toLocaleLowerCase(),b.display_name.toLocaleLowerCase())||compare(a.user_id,b.user_id));
  const nameCounts=new Map();
  for(const response of sorted){const key=response.display_name.toLocaleLowerCase();nameCounts.set(key,(nameCounts.get(key)||0)+1)}
  const nameOrdinals=new Map();
  const rows=sorted.map(response=>{
    const key=response.display_name.toLocaleLowerCase();
    const ordinal=(nameOrdinals.get(key)||0)+1;nameOrdinals.set(key,ordinal);
    const isCurrentUser=response.user_id===currentUserId;
    const label=nameCounts.get(key)>1?`${response.display_name} (${isCurrentUser?'You':ordinal})`:isCurrentUser?`${response.display_name} (You)`:response.display_name;
    const selected=new Set(response.slots);
    return {userId:response.user_id,displayName:response.display_name,label,isCurrentUser,color:palette[hashId(response.user_id)%palette.length],slotIds:ordered.filter(slot=>selected.has(slot.id)).map(slot=>slot.id),runs:runsFor(ordered,selected)};
  });
  const selectedByRow=sorted.map(response=>new Set(response.slots));
  const countById={};
  const days=[];
  for(const slot of ordered){
    const count=selectedByRow.filter(ids=>ids.has(slot.id)).length;
    countById[slot.id]=count;
    if(days.at(-1)?.date!==slot.date)days.push({date:slot.date,slots:[]});
    days.at(-1).slots.push({...slot,count,all:responses.length>0&&count===responses.length});
  }
  return {responseCount:responses.length,days,rows,countById};
}
