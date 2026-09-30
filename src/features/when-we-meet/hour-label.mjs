export function hourLabel(time){
 if(!/^\d{2}:00$/.test(time))return '';
 const hour=Number(time.slice(0,2));
 return `${hour%12||12} ${hour<12?'AM':'PM'}`;
}
/** `06:00` → `6:00 AM` (the meeting's wall clock; no time-zone conversion). */
export function clockLabel(time){
 const hour=Number(time.slice(0,2));
 return `${hour%12||12}:${time.slice(3,5)} ${hour<12?'AM':'PM'}`;
}
const dayFormat=new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
/** `2026-09-30` → `Wed, Sep 30`. */
export function dayLabel(date){return dayFormat.format(new Date(`${date}T00:00:00Z`))}
