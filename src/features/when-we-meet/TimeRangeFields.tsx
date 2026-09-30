'use client';
import {useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Check} from 'lucide-react';
import {DateTimePicker} from './DateTimePicker';
import './time-range-fields.css';
export function TimeRangeFields({start,end,onChange}:{start:string;end:string;onChange:(start:string,end:string)=>void}){
 const allDay=start==='00:00'&&end==='24:00';
 const previous=useRef({start:'09:00',end:'18:00'});
 return <div className="wwm-time-range"><div className="wwm-all-day-row"><span>Time range</span><Button type="button" variant="ghost" role="checkbox" aria-checked={allDay} aria-label="All day" onClick={()=>{if(allDay){onChange(previous.current.start,previous.current.end)}else{previous.current={start,end};onChange('00:00','24:00')}}}><span className="wwm-checkbox-mark" aria-hidden="true">{allDay&&<Check size={12}/>}</span>All day</Button></div>{!allDay&&<div className="wwm-time-range-inputs"><DateTimePicker label="From" kind="time" value={start} max="23:30" onChange={value=>onChange(value,end>value?end:'24:00')}/><DateTimePicker label="To" kind="time" value={end} minTime={start} onChange={value=>onChange(start,value)}/></div>}</div>;
}
