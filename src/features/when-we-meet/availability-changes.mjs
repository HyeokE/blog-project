// Apply only the user's change relative to their baseline, preserving remote edits.
export function mergeAvailability(current,desired,base){
 const before=new Set(base.slots),after=new Set(desired.slots),result=new Set(current.slots);
 for(const id of before)if(!after.has(id))result.delete(id);
 for(const id of after)if(!before.has(id))result.add(id);
 return {name:desired.name===base.name?current.name:desired.name,slots:[...result].sort()};
}
