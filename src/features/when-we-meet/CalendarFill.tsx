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
import {rich,useWwmCopy} from './i18n/WwmI18nProvider';
import {publishFillHighlight} from './fill-highlight.mjs';
import {DateRangePicker} from './DateRangePicker';
import {useMediaQuery} from './use-media-query';
import './calendar-fill.css';
/** Long enough to notice the change and reach Undo (the default ~4s is too short for an action toast). */
const UNDO_TOAST_MS=10_000;

type Slot={id:string;utc:string;date:string;time:string};
type State={kind:'idle'}|{kind:'pending'}|{kind:'preview';preview:FillPreview}|{kind:'reconnect'}|{kind:'error';message:string};

/**
 * Quiet toolbar action: preview free half-hours from the member's own Google Calendar in a small panel
 * anchored to the button (a bottom sheet on phones). Nothing changes until the explicit Fill.
 * After Fill (and Undo) the changed slot ids are published to `fill-highlight.mjs` and passed to `onApplied`,
 * so the grid can scroll the first changed half-hour into view and mark the change.
 */
export function CalendarFill({roomId,slots,selected,onApply,onApplied,onReconnect}:{roomId:string;slots:Slot[];selected:string[];onApply:(slotIds:string[])=>void;onApplied?:(changedSlotIds:string[])=>void;onReconnect:()=>void}){
 const copy=useWwmCopy(),{t}=copy,title=t('fill.trigger');
 const [state,setState]=useState<State>({kind:'idle'});
 const dates=slots.map(slot=>slot.date).sort(),roomRange:FillRange={start:dates[0]??'',end:dates.at(-1)??''};
 const [range,setRange]=useState<FillRange>(roomRange);
 const attempt=useRef(0),trigger=useRef<HTMLButtonElement>(null);
 const phone=useMediaQuery('(max-width: 640px)');
 async function check(){
  const id=++attempt.current;setState({kind:'pending'});setRange(roomRange);
  try{const preview=fillPreview(await loadCalendarBusy(roomId),slots);if(attempt.current===id)setState({kind:'preview',preview});}
  catch(error){if(attempt.current!==id)return;const failure=fillFailure(error,t);setState(failure.kind==='reconnect'?{kind:'reconnect'}:{kind:'error',message:failure.message});}
 }
 function dismiss(){attempt.current++;setState({kind:'idle'})}
 function apply(preview:FillPreview){
  const previous=[...selected],summary=fillSummaryInRange(preview,slots,range);
  const next=applyFillInRange(selected,preview.slotIds,slots,range),changes=fillChanges(previous,next);
  onApply(next);setState({kind:'idle'});
  publishFillHighlight(changes.changed);onApplied?.(changes.changed);
  toast.success(copy.fillToast(summary.freeCount,changes.removed.length),{duration:UNDO_TOAST_MS,action:{label:t('fill.undo'),onClick:()=>{onApply(previous);publishFillHighlight(changes.changed);onApplied?.(changes.changed)}}});
 }
 const pending=state.kind==='pending',open=state.kind==='preview'||state.kind==='reconnect'||state.kind==='error';
 const cancel=<Button type="button" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_DISMISS} onClick={dismiss}>{t('common.cancel')}</Button>;
 const body=<div className="wwm-fill-body" data-analytics-section={ANALYTICS_SECTIONS.WWM_ROOM}>
  {state.kind==='preview'&&(()=>{const summary=fillSummaryInRange(state.preview,slots,range);return <>
   <DateRangePicker id="wwm-fill-range" label={t('common.dates')} ariaLabel={t('picker.chooseDatesToFill')} required={false} compactValue start={range.start} end={range.end} minDate={roomRange.start} maxDate={roomRange.end} onChange={(start,end)=>setRange({start,end})}/>
   <div className="wwm-fill-summary" role="status">{summary.canApply?<><p>{rich(t('fill.freeCount',{count:summary.freeCount}),String(summary.freeCount),<strong>{summary.freeCount}</strong>)}</p><p className="wwm-fill-muted">{t('fill.onlyTheseDates')}</p></>:<p>{t('fill.none')}</p>}</div>
   <div className="wwm-fill-actions">{cancel}{summary.canApply&&<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL_APPLY} onClick={()=>apply(state.preview)}>{copy.fillButtonLabel(summary.freeCount)}</Button>}</div>
  </>})()}
  {state.kind==='reconnect'&&<><p className="wwm-fill-summary" role="status">{t('fill.connectPrompt')}</p><div className="wwm-fill-actions" data-stack="true">{cancel}<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_CONNECT} aria-label={t('fill.connectGoogleCalendar')} onClick={onReconnect}>{t('fill.connect')}</Button></div></>}
  {state.kind==='error'&&<><p className="wwm-fill-summary" role="alert">{state.message}</p><div className="wwm-fill-actions">{cancel}<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>void check()}>{t('common.retry')}</Button></div></>}
 </div>;
 const button=<Button ref={trigger} type="button" variant="outline" size="lg" className="wwm-calendar-fill-trigger" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_FILL} disabled={pending} aria-busy={pending||undefined} aria-expanded={open} aria-haspopup="dialog" onClick={()=>void check()}><CalendarDays aria-hidden="true"/>{pending?t('fill.checking'):title}</Button>;
 const refocus=(event:Event)=>{event.preventDefault();trigger.current?.focus()};
 if(phone)return <>{button}<Dialog open={open} onOpenChange={next=>{if(!next)dismiss()}}><DialogContent className="wwm-fill-sheet" closeLabel={t('common.close')} onCloseAutoFocus={refocus}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="wwm-sr-only">{t('fill.intro')}</DialogDescription></DialogHeader>{body}</DialogContent></Dialog></>;
 return <Popover open={open} onOpenChange={next=>{if(!next)dismiss()}}><PopoverAnchor asChild>{button}</PopoverAnchor>
  {/* The date picker opens its own popover; clicks inside it are not "outside" this panel. */}
  <PopoverContent className="wwm-fill-panel" role="dialog" aria-label={title} align="end" side="bottom" sideOffset={8} collisionPadding={16} onCloseAutoFocus={refocus} onInteractOutside={event=>{const target=event.target as Element|null;if(target?.closest?.('[data-slot="popover-content"],.wwm-calendar-fill-trigger'))event.preventDefault()}}>{body}</PopoverContent>
 </Popover>;
}
