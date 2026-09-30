// Shared, framework-free store for "what did Fill from Google Calendar just change".
// CalendarFill publishes after Apply (and Undo); the grid (WeeklyAvailability, lane A) may subscribe
// to scroll the first changed slot into view and briefly mark the changed cells.
// Contract: {slotIds: sorted ISO slot ids, firstSlotId: earliest id or null, nonce: increases per publish}.
let current={slotIds:[],firstSlotId:null,nonce:0};
const listeners=new Set();
const byTime=(a,b)=>Date.parse(a)-Date.parse(b);
export function readFillHighlight(){return current}
export function subscribeFillHighlight(listener){listeners.add(listener);return()=>{listeners.delete(listener)}}
export function publishFillHighlight(slotIds){
 const sorted=[...new Set(slotIds)].sort(byTime);
 current={slotIds:sorted,firstSlotId:sorted[0]??null,nonce:current.nonce+1};
 for(const listener of [...listeners])listener();
}
export function clearFillHighlight(){if(!current.slotIds.length)return;current={slotIds:[],firstSlotId:null,nonce:current.nonce+1};for(const listener of [...listeners])listener()}
