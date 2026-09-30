'use client';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {Calendar} from '@/components/ui/calendar';
import {FieldTrigger} from '@/components/ui/field-trigger';
import {useFloatingLayer} from '@/components/ui/layer';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {isRangeDateDisabled,rangeDays,resetRange,selectRangeDate} from './range.mjs';
import {formatCraftDate,formatCraftRange} from './display-date.mjs';
import {useMediaQuery} from './use-media-query';
import './date-range-picker.css';

type Range={start:string;end:string;phase:string;error:string};
const fromISO=(value:string)=>value?new Date(`${value}T12:00:00`):undefined;
const toISO=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export function DateRangePicker({start,end,onChange,minDate,maxDate,error,id='wwm-range',label='Dates',ariaLabel,required=true,errorId='wwm-create-dates-error'}:{ariaLabel?:string;start:string;end:string;onChange:(start:string,end:string)=>void;minDate:string;maxDate?:string;error?:string;id?:string;label?:string;required?:boolean;errorId?:string}){
 const [open,setOpen]=useState(false);
 const [draft,setDraft]=useState<Range>(resetRange);
 const [month,setMonth]=useState<Date>(()=>fromISO(start)||new Date());
 const twoMonths=useMediaQuery('(min-width: 760px)');
 // A phone-width sheet has no room for a floating calendar: render it inline below the trigger instead
 // of covering the sheet title.
 const phone=useMediaQuery('(max-width: 480px)'),layer=useFloatingLayer();
 const inline=phone&&layer==='dialog';
 const months=twoMonths&&!inline?2:1;
 const trigger=useRef<HTMLButtonElement>(null);
 function openChange(next:boolean){
  if(next){setDraft(start&&end?{start,end,phase:'start',error:''}:resetRange());setMonth(fromISO(start&&start>=minDate?start:minDate)||new Date());}
  setOpen(next);
 }
 const display=(value:string)=>value?formatCraftDate(value):'Choose dates';
 const announcement=draft.error?`That end date is more than 14 days after ${display(draft.start)}. Choose an earlier end date.`:draft.phase==='end'?`Start ${display(draft.start)}. Choose an end date.`:draft.start&&draft.end?`Current range ${display(draft.start)} to ${display(draft.end)}, ${rangeDays(draft.start,draft.end)} days. Choose a new start date to replace it.`:'Choose a start date.';
 const panelLabel=ariaLabel??(label==='Dates'?'Choose meeting dates':`Choose ${label.toLowerCase()}`);
 const value=start||end?formatCraftRange(start,end):'';
 const field=(extra?:React.ComponentProps<typeof FieldTrigger>)=><FieldTrigger id={`${id}-trigger`} ref={trigger} valueId={`${id}-value`} data-analytics-label={ANALYTICS_ELEMENTS.DATE_RANGE_PICKER} className="wwm-picker-trigger" value={value} placeholder="Choose dates" icon={<CalendarDays aria-hidden="true"/>} aria-required={required||undefined} aria-invalid={Boolean(error)} aria-describedby={error?errorId:undefined} {...extra}/>;
 const calendar=<>
  <p className="sr-only" id={`${id}-guidance`}>Select a start date, then an end date up to 14 consecutive days later. Selecting an earlier date starts a new range. The range is saved when you choose the end date; Escape keeps the previous range.</p>
  <Calendar mode="range" month={month} onMonthChange={setMonth} selected={draft.start?{from:fromISO(draft.start),to:fromISO(draft.end)}:undefined} onSelect={(_selection,day)=>{if(!day||isRangeDateDisabled(draft,toISO(day),minDate,maxDate)){return;}const next=selectRangeDate(draft,toISO(day));if(next.phase==='complete'){onChange(next.start,next.end);setOpen(false);if(inline){trigger.current?.focus()}}else{setDraft(next);}}} disabled={day=>isRangeDateDisabled(draft,toISO(day),minDate,maxDate)} numberOfMonths={months} showOutsideDays={false} weekStartsOn={0} className="wwm-range-calendar" aria-label="Meeting date range" aria-describedby={`${id}-guidance`} />
  <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
 </>;
 if(inline){
  // Escape closes only the inline calendar; the create dialog keeps itself open while aria-expanded is true.
  return <div className="wwm-range" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus()}}}>
   <RequiredFieldLabel required={required} className="wwm-picker-label" htmlFor={`${id}-trigger`}>{label}</RequiredFieldLabel>
   {field({placeholder:'Choose dates','aria-expanded':open,'aria-controls':`${id}-panel`,onClick:()=>openChange(!open)})}
   {open&&<div id={`${id}-panel`} role="group" aria-label={panelLabel} className="wwm-range-inline">{calendar}</div>}
  </div>;
 }
 return <div className="wwm-range">
  <RequiredFieldLabel required={required} className="wwm-picker-label" htmlFor={`${id}-trigger`}>{label}</RequiredFieldLabel>
  <Popover open={open} onOpenChange={openChange} modal>
   <PopoverTrigger asChild>{field()}</PopoverTrigger>
   <PopoverContent id={`${id}-panel`} className="wwm-range-popover" aria-label={panelLabel} align="start" side="bottom" sideOffset={6} collisionPadding={16} avoidCollisions onEscapeKeyDown={event=>event.stopPropagation()} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus();}}>
    {calendar}
   </PopoverContent>
  </Popover>
 </div>;
}
