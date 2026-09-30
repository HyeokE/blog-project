import {createWwmTranslator} from '../../i18n/wwm.mjs';
const english=createWwmTranslator('en');
const dateRE=/^\d{4}-\d\d-\d\d$/;
const timeRE=/^(?:[01]\d|2[0-3]):(?:00|30)$/;
const minutes=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
/** First problem with a meeting window as a stable code (`validation.<code>` in the When We Meet dictionaries), or null. */
export function validateRoomCode(r){
  if(!r.title?.trim()||r.title.trim().length>100)return 'title';
  const validDate=d=>dateRE.test(d)&&Number.isFinite(Date.parse(d+'T00:00:00Z'))&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
  if(!validDate(r.startDate)||!validDate(r.endDate))return 'dates';
  const a=Date.parse(r.startDate+'T00:00:00Z'),b=Date.parse(r.endDate+'T00:00:00Z');
  if(b<a||b-a>=14*86400000)return 'maxDays';
  if(!timeRE.test(r.startTime)||!(r.endTime==='24:00'||timeRE.test(r.endTime)))return 'aligned';
  if(minutes(r.endTime)<=minutes(r.startTime))return 'endAfterStart';
  try{new Intl.DateTimeFormat('en-US',{timeZone:r.timezone}).format();}catch{return 'timezone';}
  return null;
}
/** The same check as a sentence; English unless a When We Meet translator is passed (server routes stay English). */
export function validateRoom(r,t=english){const code=validateRoomCode(r);return code?t(`validation.${code}`):null;}
export function makeSlots(r){
  if(validateRoom(r))return [];
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:r.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const out=[];
  for(let day=Date.parse(r.startDate+'T00:00:00Z');day<=Date.parse(r.endDate+'T00:00:00Z');day+=86400000){
    const date=new Date(day).toISOString().slice(0,10);
    for(let m=minutes(r.startTime);m<minutes(r.endTime);m+=30){
      const label=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
      // Search candidate instants across all supported UTC offsets; repeated fall-back hours yield distinct UTC slots.
      for(let instant=day+m*60000-14*3600000;instant<=day+m*60000+14*3600000;instant+=1800000){
        const parts=Object.fromEntries(formatter.formatToParts(new Date(instant)).map(x=>[x.type,x.value]));
        if(`${parts.year}-${parts.month}-${parts.day}`===date&&`${parts.hour}:${parts.minute}`===label)
          out.push({id:new Date(instant).toISOString(),utc:new Date(instant).toISOString(),date,time:label});
      }
    }
  }
  return out.sort((a,b)=>a.utc.localeCompare(b.utc));
}
export function toggleSlot(current,id){return current.includes(id)?current.filter(x=>x!==id):[...current,id].sort();}
export function aggregate(slotIds,responses){return slotIds.map(id=>{const count=responses.filter(r=>r.slots.includes(id)).length;return {id,count,all:responses.length>0&&count===responses.length};}).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id));}
