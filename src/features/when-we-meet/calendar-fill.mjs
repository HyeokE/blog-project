// "Fill from Google Calendar" preview helpers. Pure: never writes availability.
// The preview is applied only after an explicit Apply, through the ordinary draft path.

/** Validate a busy-preview payload and keep only ids that are real room slots. */
export function fillPreview(result,slots){
 if(!result||typeof result!=='object'||!Array.isArray(result.availableSlotIds)||!Number.isSafeInteger(result.slotCount)||result.slotCount<0)throw new Error('Invalid calendar preview');
 const known=new Set(slots.map(slot=>slot.id));
 const slotIds=[...new Set(result.availableSlotIds.filter(id=>typeof id==='string'&&known.has(id)))].sort();
 return {slotIds,freeCount:slotIds.length,slotCount:result.slotCount,canApply:slotIds.length>0};
}

export function fillSummary(preview){
 if(!preview.canApply)return 'No free half-hours found in your calendar for this meeting.';
 return `${preview.freeCount} of ${preview.slotCount} half-hours free in your calendar.`;
}

/** 409 + reconnect → connect Google Calendar; anything else is an inline, retryable error. */
export function fillFailure(error){
 if(error&&error.status===409&&error.reconnect===true)return {kind:'reconnect'};
 return {kind:'error',message:'Could not read your calendar.'};
}

const inRange=(slot,range)=>slot.date>=range.start&&slot.date<=range.end;
/** Replace the selection only inside the chosen room-local period; keep everything outside it. */
export function applyFillInRange(selected,freeIds,slots,range){
 const inside=new Set(slots.filter(slot=>inRange(slot,range)).map(slot=>slot.id));
 return [...new Set([...selected.filter(id=>!inside.has(id)),...freeIds.filter(id=>inside.has(id))])].sort();
}
export function fillSummaryInRange(preview,slots,range){
 const inside=slots.filter(slot=>inRange(slot,range));
 const ids=new Set(inside.map(slot=>slot.id));
 const freeCount=preview.slotIds.filter(id=>ids.has(id)).length,slotCount=inside.length;
 const text=freeCount?`${freeCount} of ${slotCount} half-hours free in your calendar.`:'No free half-hours in your calendar for these dates.';
 return {freeCount,slotCount,canApply:freeCount>0,text};
}
/** Announcement for the `?calendar=<outcome>` flag the Calendar consent callback adds. Nothing is fetched or applied. */
export function calendarReturnNotice(outcome){
 if(outcome==='connected')return {tone:'success',text:'Google Calendar connected. Use Fill from Google Calendar to preview your free time.'};
 if(outcome==='denied')return {tone:'info',text:'Google Calendar was not connected. Your selection is unchanged.'};
 if(outcome==='error')return {tone:'error',text:'Could not connect Google Calendar. Please try again.'};
 return null;
}
