'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {AnimatePresence,motion,useReducedMotion} from 'framer-motion';
import { useEffect, useId, useRef, useState } from 'react';
import { calendarDays, halfHourOptions, moveCalendarDate } from './picker.mjs';
import { validTimeOptions, initialTimeFocus } from './time-options.mjs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import './time-picker.css';

type PickerProps={label:string;value:string;onChange:(value:string)=>void;kind:'date'|'time';min?:string;max?:string;minTime?:string};

function TimePicker({label,value,onChange,min,max,minTime}:PickerProps){
  const [open,setOpen]=useState(false);
  const [focused,setFocused]=useState('');
  const uid=useId();
  const trigger=useRef<HTMLButtonElement>(null);
  const options:string[]=validTimeOptions({minTime,min,max});
  const chosen=initialTimeFocus(options,value);
  useEffect(()=>{if(open){setFocused(chosen)}},[open,chosen]);
  useEffect(()=>{
    if(!open||!focused){return;}
    const frame=requestAnimationFrame(()=>document.getElementById(`${uid}-option-${focused}`)?.scrollIntoView({block:'nearest'}));
    return ()=>cancelAnimationFrame(frame);
  },[open,focused,uid]);
  function keys(event:React.KeyboardEvent<HTMLDivElement>){
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key)){return;}
    event.preventDefault();
    if(!options.length){return;}
    const index=Math.max(0,options.indexOf(focused));
    const next=event.key==='Home'?0:event.key==='End'?options.length-1:Math.max(0,Math.min(options.length-1,index+(event.key==='ArrowDown'?1:-1)));
    setFocused(options[next]);
    document.getElementById(`${uid}-option-${options[next]}`)?.focus();
  }
  return <div className="wwm-picker wwm-time-picker"><RequiredFieldLabel required className="wwm-picker-label" htmlFor={`${uid}-trigger`}>{label}</RequiredFieldLabel>
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild><button id={`${uid}-trigger`} ref={trigger} type="button" data-analytics-label={ANALYTICS_ELEMENTS.TIME_PICKER} className="wwm-picker-trigger" aria-required="true" aria-label={`${label}, ${value||'Choose a time'}`}><span>{value||'Choose a time'}</span><span aria-hidden="true">⌄</span></button></PopoverTrigger>
      <PopoverContent id={`${uid}-panel`} align="start" sideOffset={6} collisionPadding={8} className="wwm-picker-panel wwm-time-panel" onOpenAutoFocus={event=>{event.preventDefault();requestAnimationFrame(()=>document.getElementById(`${uid}-option-${chosen}`)?.focus())}} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus()}} onKeyDown={keys}>
        {options.length?<ScrollArea className="wwm-time-scroll"><div className="wwm-time-options" role="listbox" aria-label={`${label} time`}>
          {options.map(time=><button id={`${uid}-option-${time}`} type="button" data-analytics-label={ANALYTICS_ELEMENTS.TIME_OPTION} role="option" key={time} data-focused={time===focused} tabIndex={time===focused?0:-1} aria-selected={time===value} onFocus={()=>setFocused(time)} onClick={()=>{onChange(time);setOpen(false)}}>{time}</button>)}
        </div></ScrollArea>:<p className="wwm-time-empty" role="status">No later times available. Choose an earlier start time.</p>}
      </PopoverContent>
    </Popover>
  </div>;
}
export function DateTimePicker(props:PickerProps){
  if(props.kind==='time'){return <TimePicker {...props}/>;}
  return <DatePicker {...props}/>;
}
function DatePicker({label,value,onChange,kind,min,max}:PickerProps){
  const options=halfHourOptions();
  const reduced=useReducedMotion();
  const [open,setOpen]=useState(false);
  const [focused,setFocused]=useState(value||new Date().toISOString().slice(0,10));
  const [month,setMonth]=useState((value||new Date().toISOString().slice(0,10)).slice(0,7));
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),items=useRef<HTMLDivElement>(null);
  const uid=useId();
  const dates=kind==='date'?calendarDays(`${month}-01`):[];
  function dismiss(){setOpen(false);trigger.current?.focus()}
  function select(next:string){onChange(next);dismiss()}
  function toggle(){if(open){dismiss();return}const next=value||(kind==='date'?new Date().toISOString().slice(0,10):'09:00');if(kind==='date'){setFocused(next);setMonth(next.slice(0,7))}setOpen(true)}
  useEffect(()=>{if(!open){return;}const onPointer=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node)){setOpen(false)}};document.addEventListener('pointerdown',onPointer);return()=>document.removeEventListener('pointerdown',onPointer)},[open]);
  useEffect(()=>{if(!open){return;}const selected=items.current?.querySelector<HTMLElement>('[data-focused="true"]');selected?.focus();selected?.scrollIntoView({block:'nearest'})},[open,focused,month,kind]);
  const display=kind==='date'?(value?new Intl.DateTimeFormat('en-US',{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`)):'Choose a date'):(value||'Choose a time');
  function dateKeys(event:React.KeyboardEvent<HTMLDivElement>){if(event.key==='Escape'){event.preventDefault();dismiss();return}if(event.key==='PageUp'||event.key==='PageDown'){event.preventDefault();const date=new Date(`${focused}T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+(event.key==='PageUp'?-1:1));const next=date.toISOString().slice(0,10);setFocused(next);setMonth(next.slice(0,7));return}const next=moveCalendarDate(focused,event.key);if(next!==focused){event.preventDefault();setFocused(next);setMonth(next.slice(0,7))}}
  function timeKeys(event:React.KeyboardEvent<HTMLDivElement>){if(event.key==='Escape'){event.preventDefault();dismiss();return}const active=document.activeElement as HTMLElement;const index=Number(active.dataset.index);if(!Number.isFinite(index)){return;}const delta=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;const next=event.key==='Home'?0:event.key==='End'?options.length-1:index+delta;if(delta||event.key==='Home'||event.key==='End'){event.preventDefault();items.current?.querySelector<HTMLElement>(`[data-index="${Math.max(0,Math.min(options.length-1,next))}"]`)?.focus()}}
  return <div className="wwm-picker" ref={root}><RequiredFieldLabel required className="wwm-picker-label" htmlFor={`${uid}-trigger`}>{label}</RequiredFieldLabel><button id={`${uid}-trigger`} type="button" ref={trigger} data-analytics-label={ANALYTICS_ELEMENTS.DATE_PICKER} className="wwm-picker-trigger" aria-required="true" aria-labelledby={`${uid}-trigger-label ${uid}-value`} aria-expanded={open} aria-controls={`${uid}-panel`} onClick={toggle} onKeyDown={e=>{if(e.key==='ArrowDown'&&!open){e.preventDefault();toggle()}if(e.key==='Escape'&&open){e.preventDefault();dismiss()}}}><span id={`${uid}-value`}>{display}</span><span aria-hidden="true">⌄</span></button>{<AnimatePresence initial={false}>{open&&<motion.div id={`${uid}-panel`} className="wwm-picker-panel" initial={reduced?false:{opacity:0}} animate={{opacity:1}} exit={reduced?{opacity:0}:{opacity:0}} transition={{duration:reduced?0:0.18}} aria-hidden={!open} onKeyDown={kind==='date'?dateKeys:timeKeys} ref={items}>{kind==='date'?<><div className="wwm-picker-month"><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MONTH_PREVIOUS} aria-label="Previous month" onClick={()=>{const d=new Date(`${month}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()-1);setFocused(d.toISOString().slice(0,10));setMonth(d.toISOString().slice(0,7))}}>←</button><strong>{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${month}-01T00:00:00Z`))}</strong><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MONTH_NEXT} aria-label="Next month" onClick={()=>{const d=new Date(`${month}-01T00:00:00Z`);d.setUTCMonth(d.getUTCMonth()+1);setFocused(d.toISOString().slice(0,10));setMonth(d.toISOString().slice(0,7))}}>→</button></div><div className="wwm-calendar" role="grid" aria-label={`${label} calendar`}>{['M','T','W','T','F','S','S'].map((day,i)=><span className="wwm-weekday" key={i} aria-hidden="true">{day}</span>)}{dates.map(date=><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.DATE_OPTION} role="gridcell" key={date} data-focused={date===focused} tabIndex={date===focused?0:-1} className={date.slice(0,7)===month?'':'wwm-outside'} aria-label={date} aria-selected={date===value} disabled={Boolean((min&&date<min)||(max&&date>max))} onFocus={()=>setFocused(date)} onClick={()=>select(date)}>{Number(date.slice(8))}</button>)}</div></>:<div className="wwm-time-options" role="listbox" aria-label={label}>{options.map((time,i)=><button type="button" data-analytics-label={ANALYTICS_ELEMENTS.TIME_OPTION} role="option" data-index={i} data-focused={time===(value||'09:00')} tabIndex={time===(value||'09:00')?0:-1} aria-selected={time===value} key={time} onClick={()=>select(time)}>{time}</button>)}</div>}</motion.div>}</AnimatePresence>}</div>
}
