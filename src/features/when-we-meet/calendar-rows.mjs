// Align each day's UTC-ordered slots by local wall-clock cycle and occurrence.
// A fall-back hour starts a new cycle; UTC identities are never converted to labels.
export function calendarRows(dates,slots){
 const perDay=new Map(dates.map(date=>[date,new Map()]));
 const keys=new Map();
 for(const date of dates){
  const ordered=slots.filter(slot=>slot.date===date).sort((a,b)=>Date.parse(a.id)-Date.parse(b.id));
  let cycle=0,previous='';
  for(const slot of ordered){
   if(previous&&slot.time<previous)cycle++;
   previous=slot.time;
   const key=`${cycle}:${slot.time}`;
   perDay.get(date).set(key,slot);
   if(!keys.has(key))keys.set(key,{key,time:slot.time,cycle,order:Date.parse(slot.id)});
  }
 }
 return [...keys.values()].sort((a,b)=>a.cycle-b.cycle||a.time.localeCompare(b.time)||a.order-b.order).map(row=>({...row,byDate:Object.fromEntries(dates.map(date=>[date,perDay.get(date).get(row.key)]).filter(([,slot])=>slot))}));
}

/** Map UTC-contiguous runs onto the shared 48px half-hour axis. */
export function calendarSizing(blocks){const participantGutter=Math.max(0,...blocks.map(block=>block.lanes))*16;return {dayWidth:Math.max(144,participantGutter+108),rowHeight:44,participantGutter};}
export function eventBlocks(rows,dates,people,rowHeight=48){
 const index=new Map();
 rows.forEach((row,i)=>dates.forEach(date=>{const slot=row.byDate[date];if(slot)index.set(slot.id,i)}));
 const blocks=people.flatMap(person=>person.runs.filter(run=>dates.includes(run.date)).map(run=>{
  const positions=run.slotIds.map(id=>index.get(id)).filter(i=>i!==undefined);
  if(!positions.length)return null;
  return {...run,userId:person.userId,label:person.label,color:person.color,top:Math.min(...positions)*rowHeight,height:positions.length*rowHeight};
 }).filter(Boolean));
 for(const date of dates){
  const daily=blocks.filter(block=>block.date===date).sort((a,b)=>a.top-b.top||b.height-a.height);
  const clusters=[];
  for(const block of daily){
   let cluster=clusters.at(-1);
   if(!cluster||block.top>=cluster.end){cluster={end:0,blocks:[]};clusters.push(cluster)}
   cluster.end=Math.max(cluster.end,block.top+block.height);
   cluster.blocks.push(block);
   const occupied=new Set(cluster.blocks.filter(other=>other!==block&&other.top+other.height>block.top).map(other=>other.lane));
   let lane=0;while(occupied.has(lane))lane++;
   block.lane=lane;
  }
  for(const cluster of clusters){const lanes=Math.max(...cluster.blocks.map(block=>block.lane))+1;for(const block of cluster.blocks)block.lanes=lanes}
 }
 return blocks;
}
