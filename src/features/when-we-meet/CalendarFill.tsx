'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {loadCalendarBusy} from './api';
import {fillPreview,fillFailure,fillSummaryInRange,applyFillInRange,type FillPreview,type FillRange} from './calendar-fill.mjs';
import {DateRangePicker} from './DateRangePicker';
import './calendar-fill.css';
/** Long enough to notice the change and reach Undo (the default ~4s is too short for an action toast). */
const UNDO_TOAST_MS=10_000;

type Slot={id:string;utc:string;date:string;time:string};
type State={kind:'idle'}|{kind:'pending'}|{kind:'preview';preview:FillPreview}|{kind:'reconnect'}|{kind:'error';message:string};

/** Quiet secondary action: preview free half-hours from the member's own Google Calendar, apply only on explicit Apply. */
export function CalendarFill({roomId,slots,selected,onApply,onReconnect}:{roomId:string;slots:Slot[];selected:string[];onApply:(slotIds:string[])=>void;onReconnect:()=>void}){
 const [state,setState]=useState<State>({kind:'idle'});
 const dates=slots.map(slot=>slot.date).sort(),roomRange:FillRange={start:dates[0]??'',end:dates.at(-1)??''};
 const [range,setRange]=useState<FillRange>(roomRange);
 const attempt=useRef(0);
 async function check(){
  const id=++attempt.current;setState({kind:'pending'});setRange(roomRange);
  try{const preview=fillPreview(await loadCalendarBusy(roomId),slots);if(attempt.current===id)setState({kind:'preview',preview});}
  catch(error){if(attempt.current!==id)return;const failure=fillFailure(error);setState(failure.kind==='reconnect'?{kind:'reconnect'}:{kind:'error',message:failure.message});}
 }
 function dismiss(){attempt.current++;setState({kind:'idle'})}
 function apply(preview:FillPreview){
  const previous=[...selected],summary=fillSummaryInRange(preview,slots,range);
  onApply(applyFillInRange(selected,preview.slotIds,slots,range));setState({kind:'idle'});
  toast.success(`Selected ${summary.freeCount} free half-hours from your calendar.`,{duration:UNDO_TOAST_MS,action:{label:'Undo',onClick:()=>onApply(previous)}});
 }
 const pending=state.kind==='pending';
 return <div className="wwm-calendar-fill">
  <Button type="button" variant="outline" size="sm" className="wwm-calendar-fill-trigger" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL} disabled={pending} aria-busy={pending||undefined} onClick={()=>void check()}><CalendarDays aria-hidden="true"/>{pending?'Checking calendar…':'Fill from Google Calendar'}</Button>
  {state.kind==='preview'&&(()=>{const summary=fillSummaryInRange(state.preview,slots,range);return <div className="wwm-calendar-fill-result"><DateRangePicker id="wwm-fill-range" label="Dates to fill" required={false} start={range.start} end={range.end} minDate={roomRange.start} maxDate={roomRange.end} onChange={(start,end)=>setRange({start,end})}/><p role="status">{summary.text}{summary.canApply&&' Apply replaces your selection on these dates only.'}</p><div className="wwm-calendar-fill-actions">{summary.canApply&&<Button type="button" size="sm" className="wwm-calendar-fill-primary" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_APPLY} onClick={()=>apply(state.preview)}>Apply</Button>}<Button type="button" size="sm" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_DISMISS} onClick={dismiss}>Dismiss</Button></div></div>})()}
  {state.kind==='reconnect'&&<div className="wwm-calendar-fill-result"><p role="status">Connect Google Calendar to see when you are free. Your selection stays as it is until you apply.</p><div className="wwm-calendar-fill-actions"><Button type="button" size="sm" className="wwm-calendar-fill-primary" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_CONNECT} onClick={onReconnect}>Connect Google Calendar</Button><Button type="button" size="sm" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_DISMISS} onClick={dismiss}>Dismiss</Button></div></div>}
  {state.kind==='error'&&<div className="wwm-calendar-fill-result"><p role="alert">{state.message}</p><div className="wwm-calendar-fill-actions"><Button type="button" size="sm" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>void check()}>Retry</Button><Button type="button" size="sm" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_DISMISS} onClick={dismiss}>Dismiss</Button></div></div>}
 </div>;
}
