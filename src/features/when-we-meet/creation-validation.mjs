import {validateRoom} from './domain.mjs';
import {MEETING_COPY} from './meeting-copy.mjs';

export function todayInTimezone(zone,clock=new Date()){
 if(typeof zone!=='string'||!zone.trim())return null;
 try{
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(clock).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
 }catch{return null}
}

export function creationErrors(values,clock=new Date()){
 const errors={};
 if(typeof values.title!=='string'||!values.title.trim()||values.title.trim().length>100)errors.title=MEETING_COPY.titleError;
 const today=todayInTimezone(values.timezone,clock);
 if(!today)errors.timezone='Choose a valid timezone.';
 const {startDate,endDate}=values;
 if(!startDate||!endDate)errors.dates='Choose a start and end date.';
 else {
  const problem=validateRoom({title:'Valid',startDate,endDate,startTime:'00:00',endTime:'24:00',timezone:today?values.timezone:'UTC'});
  if(problem)errors.dates=problem;
  else if(startDate<today)errors.dates='Choose dates that are not in the past.';
 }
 if(typeof values.name!=='string'||!values.name.trim()||values.name.trim().length>50)errors.name='Enter your name (up to 50 characters).';
 return errors;
}

export function revalidateCreationErrors(previous,values,clock=new Date()){
 const current=creationErrors(values,clock);
 const result={};
 for(const field of Object.keys(previous)){
  if(current[field])result[field]=current[field];
 }
 const today=todayInTimezone(values.timezone,clock);
 if(today&&values.startDate&&values.startDate<today&&current.dates)result.dates=current.dates;
 return result;
}
