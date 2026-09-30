// Owner schedule edits (Settings): validation and the effect on saved availability. Pure.
// Rule: saved half-hours outside the new dates/hours/timezone are removed by the server; a confirmed
// meeting (its Google event and invitations) is left exactly as it was.
import {makeSlots,validateRoomCode} from './domain.mjs';
import {todayInTimezone} from './creation-validation.mjs';
import {createWwmTranslator} from '../../i18n/wwm.mjs';
const english=createWwmTranslator('en');
const DATE_CODES=['dates','maxDays'],TIME_CODES=['aligned','endAfterStart'];

const WINDOW=['startDate','endDate','startTime','endTime','timezone'];
export function scheduleChanged(before,after){return WINDOW.some(key=>before[key]!==after[key])}

/** Same rules as creation. A start date in the past is accepted only when it is the meeting's existing start. */
export function scheduleErrors(values,{previousStart}={},clock=new Date(),t=english){
 const errors={};
 const today=todayInTimezone(values.timezone,clock);
 if(!today)errors.timezone=t('validation.timezone');
 const {startDate,endDate,startTime,endTime}=values;
 if(!startDate||!endDate)errors.dates=t('validation.datesRequired');
 const problem=validateRoomCode({title:'Valid',startDate:startDate||'',endDate:endDate||'',startTime,endTime,timezone:today?values.timezone:'UTC'});
 if(!errors.dates&&DATE_CODES.includes(problem))errors.dates=t(`validation.${problem}`);
 else if(TIME_CODES.includes(problem))errors.times=t(`validation.${problem}`);
 if(!errors.dates&&today&&startDate<today&&startDate!==previousStart)errors.dates=t('validation.pastDates');
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
