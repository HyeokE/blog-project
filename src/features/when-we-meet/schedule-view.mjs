export function visibleDates(dates,offset,size){return dates.slice(Math.max(0,Math.min(offset,Math.max(0,dates.length-size))),Math.max(0,Math.min(offset,Math.max(0,dates.length-size)))+size)}
export function shiftWindow(offset,direction,total,size){return Math.max(0,Math.min(offset+direction*size,Math.max(0,total-size)))}
export function slotLabel(view,selected,count,total){if(view==='mine')return selected?'Selected':'Not selected';return total?`${count}/${total} available`:'No saved responses'}
export function rangePreview(start,end){const days=start&&end?Math.round((Date.parse(end+'T00:00:00Z')-Date.parse(start+'T00:00:00Z'))/86400000)+1:0;return {days,valid:days>0&&days<=14}}

export function offsetForDate(dates,date,size=3){const index=dates.indexOf(date);return index<0?null:Math.min(index,Math.max(0,dates.length-size))}
export function calendarDays(year,month){const first=new Date(Date.UTC(year,month,1));const start=first.getUTCDay();const length=new Date(Date.UTC(year,month+1,0)).getUTCDate();return [...Array(start).fill(null),...Array.from({length},(_,i)=>`${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`)]}
