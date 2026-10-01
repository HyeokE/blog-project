// Display-only time zone for a room. Saved availability and confirmations are UTC instants (a slot's id); the room's
// time zone decides which clock a slot is labelled with. Viewing "in my time zone" only relabels slots (date/time),
// so nothing stored changes and the same instants stay selected.
const formatters=new Map();
function parts(zone){
 let formatter=formatters.get(zone);
 if(!formatter){formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});formatters.set(zone,formatter)}
 return formatter;
}
/** `{date:'2026-10-02', time:'09:30'}` for a UTC instant on `zone`'s clock. */
export function clockIn(instant,zone){
 const p=Object.fromEntries(parts(zone).formatToParts(new Date(instant)).map(x=>[x.type,x.value]));
 return {date:`${p.year}-${p.month}-${p.day}`,time:`${p.hour}:${p.minute}`};
}
/** The same slots labelled on `zone`'s clock (ids, UTC and order unchanged). */
export function projectSlots(slots,zone){
 return slots.map(slot=>({...slot,...clockIn(slot.utc||slot.id,zone)}));
}
/** Every slot lands on a half hour (zones like Nepal, +5:45, would put cells on :15/:45, which the grid does not draw). */
export function isHalfHourAligned(slots){return slots.every(slot=>/:(00|30)$/.test(slot.time))}
/** True when `zone` labels at least one slot differently from the room's own clock. */
export function labelsDiffer(slots,projected){return slots.some((slot,index)=>slot.date!==projected[index].date||slot.time!==projected[index].time)}
/**
 * What to show for a room: the room's own labels, or `zone`'s when a different zone is offered and chosen.
 * `offered` is false when `zone` is the room's, reads the same, or cannot be drawn (not on the half hour).
 */
export function timezoneView({slots,roomZone,zone,useZone}){
 const empty={offered:false,zone:roomZone,slots,startDate:slots[0]?.date||'',endDate:slots.at(-1)?.date||'',startTime:'00:00',endTime:'24:00'};
 if(!zone||zone===roomZone||!slots.length)return empty;
 let projected;
 try{projected=projectSlots(slots,zone)}catch{return empty}
 if(!isHalfHourAligned(projected)||!labelsDiffer(slots,projected))return empty;
 if(!useZone)return {...empty,offered:true};
 const ordered=[...projected].sort((a,b)=>a.utc.localeCompare(b.utc));
 return {offered:true,zone,slots:projected,startDate:ordered[0].date,endDate:ordered.at(-1).date,startTime:'00:00',endTime:'24:00'};
}
