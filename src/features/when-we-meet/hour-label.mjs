// Wall-clock and calendar-day labels for the availability grid. `locale` is a When We Meet locale ('en' | 'ko');
// English keeps its hand-built 12-hour form ("9 AM", "6:00 AM"), other locales use Intl ("오전 9시", "오전 6:00").
const intlLocale=locale=>locale==='ko'?'ko-KR':'en-US';
const wallClock=time=>new Date(Date.UTC(2000,0,1,Number(time.slice(0,2)),Number(time.slice(3,5))));
const formats=new Map();
function format(locale,options){
 const key=`${locale}:${JSON.stringify(options)}`;
 if(!formats.has(key))formats.set(key,new Intl.DateTimeFormat(intlLocale(locale),{timeZone:'UTC',...options}));
 return formats.get(key);
}
export function hourLabel(time,locale='en'){
 if(!/^\d{2}:00$/.test(time))return '';
 const hour=Number(time.slice(0,2));
 if(locale!=='ko')return `${hour%12||12} ${hour<12?'AM':'PM'}`;
 return format(locale,{hour:'numeric'}).format(wallClock(time));
}
/** `06:00` → `6:00 AM` / `오전 6:00` (the meeting's wall clock; no time-zone conversion). */
export function clockLabel(time,locale='en'){
 const hour=Number(time.slice(0,2));
 if(locale!=='ko')return `${hour%12||12}:${time.slice(3,5)} ${hour<12?'AM':'PM'}`;
 return format(locale,{hour:'numeric',minute:'2-digit'}).format(wallClock(time));
}
/** `2026-09-30` → `Wed, Sep 30` / `9월 30일 (수)`. */
export function dayLabel(date,locale='en'){return format(locale,{weekday:'short',month:'short',day:'numeric'}).format(new Date(`${date}T00:00:00Z`))}
/** `2026-09-30` → `Wed` / `수`. */
export function weekdayLabel(date,locale='en'){return format(locale,{weekday:'short'}).format(new Date(`${date}T00:00:00Z`))}
