'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useRef,useState} from 'react';
import {CalendarDays} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Popover,PopoverAnchor,PopoverContent} from '@/components/ui/popover';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {loadCalendarBusy} from './api';
import {fillPreview,fillFailure,fillSummaryInRange,applyFillInRange,fillChanges,type FillPreview,type FillRange} from './calendar-fill.mjs';
import {fillButtonLabel,fillToast,MEETING_COPY} from './meeting-copy.mjs';
import {publishFillHighlight} from './fill-highlight.mjs';
import {DateRangePicker} from './DateRangePicker';
import {useMediaQuery} from './use-media-query';
import './calendar-fill.css';
/** Long enough to notice the change and reach Undo (the default ~4s is too short for an action toast). */
const UNDO_TOAST_MS=10_000;
const TITLE='Fill from Google Calendar';

type Slot={id:string;utc:string;date:string;time:string};
type State={kind:'idle'}|{kind:'pending'}|{kind:'preview';preview:FillPreview}|{kind:'reconnect'}|{kind:'error';message:string};

/**
 * Quiet toolbar action: preview free half-hours from the member's own Google Calendar in a small panel
 * anchored to the button (a bottom sheet on phones). Nothing changes until the explicit Fill.
 * After Fill (and Undo) the changed slot ids are published to `fill-highlight.mjs` and passed to `onApplied`,
 * so the grid can scroll the first changed half-hour into view and mark the change.
 */
export function CalendarFill({roomId,slots,selected,onApply,onApplied,onReconnect}:{roomId:string;slots:Slot[];selected:string[];onApply:(slotIds:string[])=>void;onApplied?:(changedSlotIds:string[])=>void;onReconnect:()=>void}){
 const [state,setState]=useState<State>({kind:'idle'});
 const dates=slots.map(slot=>slot.date).sort(),roomRange:FillRange={start:dates[0]??'',end:dates.at(-1)??''};
 const [range,setRange]=useState<FillRange>(roomRange);
 const attempt=useRef(0),trigger=useRef<HTMLButtonElement>(null);
 const phone=useMediaQuery('(max-width: 640px)');
 async function check(){
  const id=++attempt.current;setState({kind:'pending'});setRange(roomRange);
  try{const preview=fillPreview(await loadCalendarBusy(roomId),slots);if(attempt.current===id)setState({kind:'preview',preview});}
  catch(error){if(attempt.current!==id)return;const failure=fillFailure(error);setState(failure.kind==='reconnect'?{kind:'reconnect'}:{kind:'error',message:failure.message});}
 }
 function dismiss(){attempt.current++;setState({kind:'idle'})}
 function apply(preview:FillPreview){
  const previous=[...selected],summary=fillSummaryInRange(preview,slots,range);
  const next=applyFillInRange(selected,preview.slotIds,slots,range),changes=fillChanges(previous,next);
  onApply(next);setState({kind:'idle'});
  publishFillHighlight(changes.changed);onApplied?.(changes.changed);
  toast.success(fillToast(summary.freeCount,changes.removed.length),{duration:UNDO_TOAST_MS,action:{label:'Undo',onClick:()=>{onApply(previous);publishFillHighlight(changes.changed);onApplied?.(changes.changed)}}});
 }
 const pending=state.kind==='pending',open=state.kind==='preview'||state.kind==='reconnect'||state.kind==='error';
 const cancel=<Button type="button" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_DISMISS} onClick={dismiss}>Cancel</Button>;
 const body=<div className="wwm-fill-body" data-analytics-section={ANALYTICS_SECTIONS.WWM_ROOM}>
  {state.kind==='preview'&&(()=>{const summary=fillSummaryInRange(state.preview,slots,range);return <>
   <DateRangePicker id="wwm-fill-range" label="Dates" required={false} compactValue start={range.start} end={range.end} minDate={roomRange.start} maxDate={roomRange.end} onChange={(start,end)=>setRange({start,end})}/>
   <div className="wwm-fill-summary" role="status">{summary.canApply?<><p><strong>{summary.freeCount}</strong> free half-hours</p><p className="wwm-fill-muted">Only these dates change</p></>:<p>No free half-hours on these dates</p>}</div>
   <div className="wwm-fill-actions">{cancel}{summary.canApply&&<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_APPLY} onClick={()=>apply(state.preview)}>{fillButtonLabel(summary.freeCount)}</Button>}</div>
  </>})()}
  {state.kind==='reconnect'&&<><p className="wwm-fill-summary" role="status">{MEETING_COPY.reconnectPrompt}</p><div className="wwm-fill-actions" data-stack="true">{cancel}<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_CONNECT} aria-label="Connect Google Calendar" onClick={onReconnect}>{MEETING_COPY.reconnect}</Button></div></>}
  {state.kind==='error'&&<><p className="wwm-fill-summary" role="alert">{state.message}</p><div className="wwm-fill-actions">{cancel}<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>void check()}>Retry</Button></div></>}
 </div>;
 const button=<Button ref={trigger} type="button" variant="outline" size="sm" className="wwm-calendar-fill-trigger" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL} disabled={pending} aria-busy={pending||undefined} aria-expanded={open} aria-haspopup="dialog" onClick={()=>void check()}><CalendarDays aria-hidden="true"/>{pending?'Checking calendar…':TITLE}</Button>;
 const refocus=(event:Event)=>{event.preventDefault();trigger.current?.focus()};
 if(phone)return <>{button}<Dialog open={open} onOpenChange={next=>{if(!next)dismiss()}}><DialogContent className="wwm-fill-sheet" onCloseAutoFocus={refocus}><DialogHeader><DialogTitle>{TITLE}</DialogTitle><DialogDescription className="wwm-sr-only">Preview the half-hours your calendar shows as free, then fill them.</DialogDescription></DialogHeader>{body}</DialogContent></Dialog></>;
 return <Popover open={open} onOpenChange={next=>{if(!next)dismiss()}}><PopoverAnchor asChild>{button}</PopoverAnchor>
  {/* The date picker opens its own popover; clicks inside it are not "outside" this panel. */}
  <PopoverContent className="wwm-fill-panel" role="dialog" aria-label={TITLE} align="end" side="bottom" sideOffset={8} collisionPadding={16} onCloseAutoFocus={refocus} onInteractOutside={event=>{const target=event.target as Element|null;if(target?.closest?.('[data-slot="popover-content"],.wwm-calendar-fill-trigger'))event.preventDefault()}}>{body}</PopoverContent>
 </Popover>;
}
