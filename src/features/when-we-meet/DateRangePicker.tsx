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
import {ko} from 'react-day-picker/locale';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import {useMediaQuery} from './use-media-query';
import './date-range-picker.css';

type Range={start:string;end:string;phase:string;error:string};
const fromISO=(value:string)=>value?new Date(`${value}T12:00:00`):undefined;
const toISO=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;

export function DateRangePicker({start,end,onChange,minDate,maxDate,error,id='wwm-range',label,ariaLabel,required=true,errorId='wwm-create-dates-error',compactValue=false}:{compactValue?:boolean;ariaLabel?:string;start:string;end:string;onChange:(start:string,end:string)=>void;minDate:string;maxDate?:string;error?:string;id?:string;label?:string;required?:boolean;errorId?:string}){
 const {t,locale,compactRange}=useWwmCopy();
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
 const display=(value:string)=>value?formatCraftDate(value):t('picker.chooseDates');
 const announcement=draft.error?t('picker.tooLong',{start:display(draft.start)}):draft.phase==='end'?t('picker.startChosen',{start:display(draft.start)}):draft.start&&draft.end?t('picker.currentRange',{start:display(draft.start),end:display(draft.end),days:rangeDays(draft.start,draft.end)}):t('picker.chooseStart');
 // The popover is named for its purpose: meeting dates unless the caller says otherwise (e.g. dates to fill).
 const panelLabel=ariaLabel??t('picker.chooseMeetingDates');
 const fieldLabel=label??t('common.dates');
 const value=start||end?(compactValue?compactRange(start,end):formatCraftRange(start,end)):'';
 const field=(extra?:React.ComponentProps<typeof FieldTrigger>)=><FieldTrigger id={`${id}-trigger`} ref={trigger} valueId={`${id}-value`} data-analytics-label={ANALYTICS_ELEMENTS.DATE_RANGE_PICKER} className="wwm-picker-trigger" value={value} placeholder={t('picker.chooseDates')} icon={<CalendarDays aria-hidden="true"/>} aria-required={required||undefined} aria-invalid={Boolean(error)} aria-describedby={error?errorId:undefined} {...extra}/>;
 const calendar=<>
  <p className="sr-only" id={`${id}-guidance`}>{t('picker.rangeGuidance')}</p>
  <Calendar mode="range" month={month} onMonthChange={setMonth} selected={draft.start?{from:fromISO(draft.start),to:fromISO(draft.end)}:undefined} onSelect={(_selection,day)=>{if(!day||isRangeDateDisabled(draft,toISO(day),minDate,maxDate)){return;}const next=selectRangeDate(draft,toISO(day));if(next.phase==='complete'){onChange(next.start,next.end);setOpen(false);if(inline){trigger.current?.focus()}}else{setDraft(next);}}} disabled={day=>isRangeDateDisabled(draft,toISO(day),minDate,maxDate)} numberOfMonths={months} showOutsideDays={false} weekStartsOn={0} className="wwm-range-calendar" locale={locale==='ko'?ko:undefined} aria-label={t('picker.dateRange')} aria-describedby={`${id}-guidance`} />
  <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
 </>;
 if(inline){
  // Escape closes only the inline calendar; the create dialog keeps itself open while aria-expanded is true.
  return <div className="wwm-range" onKeyDown={event=>{if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus()}}}>
   <RequiredFieldLabel required={required} className="wwm-picker-label" htmlFor={`${id}-trigger`}>{fieldLabel}</RequiredFieldLabel>
   {field({placeholder:t('picker.chooseDates'),'aria-expanded':open,'aria-controls':`${id}-panel`,onClick:()=>openChange(!open)})}
   {open&&<div id={`${id}-panel`} role="group" aria-label={panelLabel} className="wwm-range-inline">{calendar}</div>}
  </div>;
 }
 return <div className="wwm-range">
  <RequiredFieldLabel required={required} className="wwm-picker-label" htmlFor={`${id}-trigger`}>{fieldLabel}</RequiredFieldLabel>
  <Popover open={open} onOpenChange={openChange} modal>
   <PopoverTrigger asChild>{field()}</PopoverTrigger>
   <PopoverContent id={`${id}-panel`} className="wwm-range-popover" aria-label={panelLabel} align="start" side="bottom" sideOffset={6} collisionPadding={16} avoidCollisions onEscapeKeyDown={event=>event.stopPropagation()} onCloseAutoFocus={event=>{event.preventDefault();trigger.current?.focus();}}>
    {calendar}
   </PopoverContent>
  </Popover>
 </div>;
}
