export function dragSegment(previous,current,slots){
 if(!previous||previous.date!==current.date)return [current];
 const day=slots.filter(slot=>slot.date===current.date).sort((a,b)=>a.id.localeCompare(b.id));
 const from=day.findIndex(slot=>slot.id===previous.id),to=day.findIndex(slot=>slot.id===current.id);
 if(from<0||to<0)return [current];
 return day.slice(Math.min(from,to),Math.max(from,to)+1);
}
