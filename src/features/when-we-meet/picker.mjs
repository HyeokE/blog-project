const dayMs=86400000;
const iso=date=>date.toISOString().slice(0,10);
const utc=value=>new Date(`${value}T00:00:00Z`);
export function calendarDays(month){
  const first=utc(`${month.slice(0,7)}-01`);
  const offset=(first.getUTCDay()+6)%7;
  const start=first.getTime()-offset*dayMs;
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0));
  const count=Math.ceil((offset+last.getUTCDate())/7)*7;
  return Array.from({length:count},(_,i)=>iso(new Date(start+i*dayMs)));
}
export function moveCalendarDate(value,key){
  const date=utc(value);
  const shifts={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-((date.getUTCDay()+6)%7),End:6-((date.getUTCDay()+6)%7)};
  return key in shifts?iso(new Date(date.getTime()+shifts[key]*dayMs)):value;
}
export function halfHourOptions(){return Array.from({length:48},(_,i)=>`${String(Math.floor(i/2)).padStart(2,'0')}:${i%2?'30':'00'}`)}
