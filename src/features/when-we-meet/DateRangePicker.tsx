'use client';
import {useEffect,useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {Calendar} from '@/components/ui/calendar';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {isRangeEndDisabled,resetRange,selectRangeDate} from './range.mjs';
import './date-range-picker.css';

type Range={start:string;end:string;phase:string;error:string};
const fromISO=(value:string)=>value?new Date(`${value}T12:00:00`):undefined;
const toISO=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const display=(value:string)=>value?value.replaceAll('-','.'):'Choose dates';

export function DateRangePicker({start,end,onChange,minDate,error}:{start:string;end:string;onChange:(start:string,end:string)=>void;minDate:string;error?:string}){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState<Range>(resetRange);
 const [month,setMonth]=useState<Date>(()=>fromISO(start)||new Date());
 const [months,setMonths]=useState(1);
 useEffect(()=>{const query=window.matchMedia('(min-width: 760px)');const update=()=>setMonths(query.matches?2:1);update();query.addEventListener('change',update);return ()=>query.removeEventListener('change',update);},[]);
 const trigger=useRef<HTMLButtonElement>(null);
 function openChange(next:boolean){
  if(next){setDraft(resetRange());setMonth(fromISO(start&&start>=minDate?start:minDate)||new Date());}
  setOpen(next);
 }
 return <div className="wwm-range">
  <RequiredFieldLabel required className="wwm-picker-label" htmlFor="wwm-range-trigger">Dates</RequiredFieldLabel>
  <Popover open={open} onOpenChange={openChange} modal>
   <PopoverTrigger asChild><button id="wwm-range-trigger" ref={trigger} type="button" className="wwm-picker-trigger" aria-required="true" aria-invalid={Boolean(error)} aria-describedby={error?'wwm-create-dates-error':undefined}><CalendarDays size={18} aria-hidden="true"/><span id="wwm-range-value">{start||end?`${display(start)} — ${display(end)}`:'Choose dates'}</span></button></PopoverTrigger>
   <PopoverContent id="wwm-range-panel" className="wwm-range-popover" align="start" side="bottom" sideOffset={6} collisionPadding={8} avoidCollisions onEscapeKeyDown={event=>event.stopPropagation()} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus();}}>
    <p className="sr-only" id="wwm-range-guidance">Select a start date and an end date, up to 14 consecutive days. Selecting an earlier date starts a new range.</p>
    <Calendar mode="range" month={month} onMonthChange={setMonth} selected={draft.start?{from:fromISO(draft.start),to:fromISO(draft.end)}:undefined} onSelect={(_selection,day)=>{if(!day||toISO(day)<minDate){return;}const next=selectRangeDate(draft,toISO(day));if(next.phase==='complete'){onChange(next.start,next.end);setOpen(false);}else{setDraft(next);}}} disabled={day=>toISO(day)<minDate||isRangeEndDisabled(draft,toISO(day))} numberOfMonths={months} showOutsideDays={false} weekStartsOn={0} className="wwm-range-calendar" aria-label="Meeting date range" aria-describedby="wwm-range-guidance" />
    <p className="sr-only" role="status" aria-live="polite">{draft.error||(!draft.start?'Choose a start date.':'Choose an end date.')}</p>
   </PopoverContent>
  </Popover>
 </div>;
}
