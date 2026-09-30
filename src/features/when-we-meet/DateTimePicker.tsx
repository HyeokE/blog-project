'use client';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {useId,useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {Calendar} from '@/components/ui/calendar';
import {FieldTrigger} from '@/components/ui/field-trigger';
import {Popover,PopoverContent,PopoverTrigger} from '@/components/ui/popover';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {validTimeOptions} from './time-options.mjs';
import {formatCraftDate} from './display-date.mjs';
import './time-picker.css';

type PickerProps={label:string;value:string;onChange:(value:string)=>void;kind:'date'|'time';min?:string;max?:string;minTime?:string};
const fromISO=(value?:string)=>value?new Date(`${value}T12:00:00`):undefined;
const toISO=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

/** Half-hour wall-clock choice on the shared Select; the list is exactly the trigger's width. */
function TimePicker({label,value,onChange,min,max,minTime}:PickerProps){
  const uid=useId();
  const options:string[]=validTimeOptions({minTime,min,max});
  // A value outside the allowed options (e.g. an end before a new start) shows the placeholder.
  const selected=options.includes(value)?value:'';
  return <div className="wwm-picker wwm-time-picker"><RequiredFieldLabel required className="wwm-picker-label" htmlFor={`${uid}-trigger`}>{label}</RequiredFieldLabel>
    <Select value={selected} onValueChange={onChange} required>
      <SelectTrigger id={`${uid}-trigger`} data-analytics-label={ANALYTICS_ELEMENTS.TIME_PICKER} className="wwm-picker-trigger" aria-required="true"><SelectValue placeholder="Choose a time"/></SelectTrigger>
      <SelectContent className="wwm-time-panel" aria-label={`${label} time`}>
        {options.length?options.map(time=><SelectItem key={time} value={time} data-analytics-label={ANALYTICS_ELEMENTS.TIME_OPTION}>{time}</SelectItem>):<p className="wwm-time-empty" data-slot="select-empty" role="status">No later times available. Choose an earlier start time.</p>}
      </SelectContent>
    </Select>
  </div>;
}

/** One date inside the room range on the shared Calendar (Sunday-first, like the creation range). */
function DatePicker({label,value,onChange,min,max}:PickerProps){
  const uid=useId();
  const [open,setOpen]=useState(false);
  const [month,setMonth]=useState<Date|undefined>(()=>fromISO(value||min));
  const trigger=useRef<HTMLButtonElement>(null);
  function openChange(next:boolean){if(next){setMonth(fromISO(value||min)||new Date())}setOpen(next)}
  const before=fromISO(min),after=fromISO(max);
  return <div className="wwm-picker"><RequiredFieldLabel required className="wwm-picker-label" htmlFor={`${uid}-trigger`}>{label}</RequiredFieldLabel>
    <Popover open={open} onOpenChange={openChange}>
      <PopoverTrigger asChild><FieldTrigger id={`${uid}-trigger`} ref={trigger} data-analytics-label={ANALYTICS_ELEMENTS.DATE_PICKER} className="wwm-picker-trigger" aria-required="true" value={value?formatCraftDate(value):''} placeholder="Choose a date" icon={<CalendarDays aria-hidden="true"/>}/></PopoverTrigger>
      <PopoverContent id={`${uid}-panel`} className="wwm-date-panel" aria-label={`${label} calendar`} align="start" side="bottom" sideOffset={6} collisionPadding={16} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus()}}>
        <Calendar mode="single" autoFocus month={month} onMonthChange={setMonth} selected={fromISO(value)} onSelect={date=>{if(date){onChange(toISO(date));setOpen(false)}}} disabled={[...(before?[{before}]:[]),...(after?[{after}]:[])]} weekStartsOn={0} showOutsideDays={false} aria-label={`${label} calendar`}/>
      </PopoverContent>
    </Popover>
  </div>;
}

export function DateTimePicker(props:PickerProps){
  if(props.kind==='time'){return <TimePicker {...props}/>;}
  return <DatePicker {...props}/>;
}
