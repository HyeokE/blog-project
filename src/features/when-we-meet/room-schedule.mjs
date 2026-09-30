// Owner schedule edits (Settings): validation and the effect on saved availability. Pure.
// Rule: saved half-hours outside the new dates/hours/timezone are removed by the server; a confirmed
// meeting (its Google event and invitations) is left exactly as it was.
import {makeSlots,validateRoom} from './domain.mjs';
import {todayInTimezone} from './creation-validation.mjs';

const WINDOW=['startDate','endDate','startTime','endTime','timezone'];
export function scheduleChanged(before,after){return WINDOW.some(key=>before[key]!==after[key])}

/** Same rules as creation. A start date in the past is accepted only when it is the meeting's existing start. */
export function scheduleErrors(values,{previousStart}={},clock=new Date()){
 const errors={};
 const today=todayInTimezone(values.timezone,clock);
 if(!today)errors.timezone='Choose a valid timezone.';
 const {startDate,endDate,startTime,endTime}=values;
 if(!startDate||!endDate)errors.dates='Choose a start and end date.';
 const problem=validateRoom({title:'Valid',startDate:startDate||'',endDate:endDate||'',startTime,endTime,timezone:today?values.timezone:'UTC'});
 if(!errors.dates&&problem&&/date|days/i.test(problem))errors.dates=problem;
 else if(problem&&/time/i.test(problem)&&!/timezone/i.test(problem))errors.times=problem;
 if(!errors.dates&&today&&startDate<today&&startDate!==previousStart)errors.dates='Choose dates that are not in the past.';
 return errors;
}

/** Saved half-hours that the new window drops, and whose they are (by display name, response order). */
export function scheduleImpact(responses,next){
 const kept=new Set(makeSlots({title:'Valid',...next}).map(slot=>slot.id));
 let removedSlots=0;const people=[];
 for(const row of responses){
  const lost=(row.slots||[]).filter(id=>!kept.has(id)).length;
  if(lost){removedSlots+=lost;people.push(row.displayName)}
 }
 return {removedSlots,people};
}
