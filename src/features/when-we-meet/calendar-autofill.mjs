/** Pure preview calculation. Caller must reject any FreeBusy calendar errors first.
 * Uses UTC instants, not local wall clocks; only returns supplied room slot IDs.
 */
export function availableSlotsFromBusy(slots,busy){
 if(!Array.isArray(slots)||!Array.isArray(busy))throw new Error('Availability data unavailable');
 const instant=value=>{if(typeof value!=='string'||!/(?:Z|[+-]\d{2}:\d{2})$/.test(value))throw new Error('Invalid calendar instant');const n=Date.parse(value);if(!Number.isFinite(n))throw new Error('Invalid calendar instant');return n;};
 const ranges=busy.map(range=>{const start=instant(range?.start),end=instant(range?.end);if(end<=start)throw new Error('Invalid busy interval');return {start,end};});
 const seen=new Set();
 return slots.filter(slot=>{if(typeof slot?.id!=='string'||seen.has(slot.id))throw new Error('Invalid room slot');seen.add(slot.id);const start=instant(slot.utc),end=start+30*60*1000;return !ranges.some(range=>range.start<end&&range.end>start);}).map(slot=>slot.id);
}
