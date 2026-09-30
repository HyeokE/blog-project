'use client';
import {ANALYTICS_ELEMENTS} from '@/constants/analytics';
import {useId,useRef} from 'react';
import {Checkbox} from '@/components/ui/checkbox';
import {DateTimePicker} from './DateTimePicker';
import './time-range-fields.css';
import {useWwmCopy} from './i18n/WwmI18nProvider';
export function TimeRangeFields({start,end,onChange}:{start:string;end:string;onChange:(start:string,end:string)=>void}){
 const {t}=useWwmCopy();
 const allDay=start==='00:00'&&end==='24:00';
 const previous=useRef({start:'09:00',end:'18:00'});
 const id=useId();
 function toggle(next:boolean){if(!next){onChange(previous.current.start,previous.current.end)}else{previous.current={start,end};onChange('00:00','24:00')}}
 return <div className="wwm-time-range"><div className="wwm-all-day-row"><span>{t('create.timeRange')}</span><label className="craft-check-row" htmlFor={`${id}-all-day`}><Checkbox id={`${id}-all-day`} data-analytics-label={ANALYTICS_ELEMENTS.ALL_DAY_TOGGLE} checked={allDay} onCheckedChange={value=>toggle(value===true)}/>{t('common.allDay')}</label></div>{!allDay&&<div className="wwm-time-range-inputs"><DateTimePicker label={t('create.from')} example={t('picker.timeExampleStart')} kind="time" value={start} max="23:30" onChange={value=>onChange(value,end>value?end:'24:00')}/><DateTimePicker label={t('create.to')} example={t('picker.timeExampleEnd')} kind="time" value={end} minTime={start} onChange={value=>onChange(start,value)}/></div>}</div>;
}
