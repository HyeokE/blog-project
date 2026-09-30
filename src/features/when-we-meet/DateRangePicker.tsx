'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useEffect,useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {Calendar} from '@/components/ui/calendar';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {isRangeDateDisabled,rangeDays,resetRange,selectRangeDate} from './range.mjs';
import './date-range-picker.css';

type Range={start:string;end:string;phase:string;error:string};
const fromISO=(value:string)=>value?new Date(`${value}T12:00:00`):undefined;
const toISO=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const display=(value:string)=>value?value.replaceAll('-','.'):'Choose dates';

export function DateRangePicker({start,end,onChange,minDate,maxDate,error,id='wwm-range',label='Dates',ariaLabel,required=true,errorId='wwm-create-dates-error'}:{ariaLabel?:string;start:string;end:string;onChange:(start:string,end:string)=>void;minDate:string;maxDate?:string;error?:string;id?:string;label?:string;required?:boolean;errorId?:string}){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState<Range>(resetRange);
 const [month,setMonth]=useState<Date>(()=>fromISO(start)||new Date());
 const [months,setMonths]=useState(1);
 useEffect(()=>{const query=window.matchMedia('(min-width: 760px)');const update=()=>setMonths(query.matches?2:1);update();query.addEventListener('change',update);return ()=>query.removeEventListener('change',update);},[]);
 const trigger=useRef<HTMLButtonElement>(null);
 function openChange(next:boolean){
  if(next){setDraft(start&&end?{start,end,phase:'start',error:''}:resetRange());setMonth(fromISO(start&&start>=minDate?start:minDate)||new Date());}
  setOpen(next);
 }
 const announcement=draft.error?`That end date is more than 14 days after ${display(draft.start)}. Choose an earlier end date.`:draft.phase==='end'?`Start ${display(draft.start)}. Choose an end date.`:draft.start&&draft.end?`Current range ${display(draft.start)} to ${display(draft.end)}, ${rangeDays(draft.start,draft.end)} days. Choose a new start date to replace it.`:'Choose a start date.';
 return <div className="wwm-range">
  <RequiredFieldLabel required={required} className="wwm-picker-label" htmlFor={`${id}-trigger`}>{label}</RequiredFieldLabel>
  <Popover open={open} onOpenChange={openChange} modal>
   <PopoverTrigger asChild><button id={`${id}-trigger`} ref={trigger} type="button" data-analytics-label={ANALYTICS_ELEMENTS.DATE_RANGE_PICKER} className="wwm-picker-trigger" aria-required={required||undefined} aria-invalid={Boolean(error)} aria-describedby={error?errorId:undefined}><CalendarDays size={18} aria-hidden="true"/><span id={`${id}-value`}>{start||end?`${display(start)} — ${display(end)}`:'Choose dates'}</span></button></PopoverTrigger>
   <PopoverContent id={`${id}-panel`} className="wwm-range-popover" aria-label={ariaLabel??(label==='Dates'?'Choose meeting dates':`Choose ${label.toLowerCase()}`)} align="start" side="bottom" sideOffset={6} collisionPadding={8} avoidCollisions onEscapeKeyDown={event=>event.stopPropagation()} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus();}}>
    <p className="sr-only" id={`${id}-guidance`}>Select a start date, then an end date up to 14 consecutive days later. Selecting an earlier date starts a new range. The range is saved when you choose the end date; Escape keeps the previous range.</p>
    <Calendar mode="range" month={month} onMonthChange={setMonth} selected={draft.start?{from:fromISO(draft.start),to:fromISO(draft.end)}:undefined} onSelect={(_selection,day)=>{if(!day||isRangeDateDisabled(draft,toISO(day),minDate,maxDate)){return;}const next=selectRangeDate(draft,toISO(day));if(next.phase==='complete'){onChange(next.start,next.end);setOpen(false);}else{setDraft(next);}}} disabled={day=>isRangeDateDisabled(draft,toISO(day),minDate,maxDate)} numberOfMonths={months} showOutsideDays={false} weekStartsOn={0} className="wwm-range-calendar" aria-label="Meeting date range" aria-describedby={`${id}-guidance`} />
    <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
   </PopoverContent>
  </Popover>
 </div>;
}
