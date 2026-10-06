import {validateRoom,validateRoomCode} from './domain.mjs';
import {createWwmTranslator} from '../../i18n/wwm.mjs';
const english=createWwmTranslator('en');

export function todayInTimezone(zone,clock=new Date()){
 if(typeof zone!=='string'||!zone.trim())return null;
 try{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(clock).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
 }catch{return null}
}

/** Field errors for the create form; `t` is the When We Meet translator (English by default). */
export function creationErrors(values,clock=new Date(),t=english){
 const errors={};
 const mode=values.scheduleMode===undefined?'time':values.scheduleMode;
 if(mode!=='time'&&mode!=='date')errors.scheduleMode=t('create.modeError');
 if(mode==='time'&&(values.startTime!==undefined||values.endTime!==undefined)){
  const problem=validateRoomCode({...values,title:'Valid',startDate:'2099-01-01',endDate:'2099-01-01',timezone:'UTC'});
  if(problem==='aligned'||problem==='endAfterStart')errors.times=t(`validation.${problem}`);
 }
 if(typeof values.title!=='string'||!values.title.trim()||values.title.trim().length>100)errors.title=t('create.titleError');
 const today=todayInTimezone(values.timezone,clock);
 if(!today)errors.timezone=t('validation.timezone');
 const {startDate,endDate}=values;
 if(!startDate||!endDate)errors.dates=t('validation.datesRequired');
 else {
  const problem=validateRoom({title:'Valid',startDate,endDate,startTime:'00:00',endTime:'24:00',timezone:today?values.timezone:'UTC'},t);
  if(problem)errors.dates=problem;
  else if(startDate<today)errors.dates=t('validation.pastDates');
 }
 if(typeof values.name!=='string'||!values.name.trim()||values.name.trim().length>50)errors.name=t('validation.name');
 return errors;
}

export function revalidateCreationErrors(previous,values,clock=new Date(),t=english){
 const current=creationErrors(values,clock,t);
 const result={};
 for(const field of Object.keys(previous)){
  if(current[field])result[field]=current[field];
 }
 const today=todayInTimezone(values.timezone,clock);
 if(today&&values.startDate&&values.startDate<today&&current.dates)result.dates=current.dates;
 return result;
}
