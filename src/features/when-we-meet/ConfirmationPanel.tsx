'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,ChevronUp,CircleCheck,CircleDashed,CircleHelp,CircleX,Clock,ExternalLink} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Tooltip,TooltipContent,TooltipProvider,TooltipTrigger} from '@/components/ui/tooltip';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';
import {Collapsible,CollapsibleContent,CollapsibleTrigger} from '@/components/ui/collapsible';
import {Notice} from './Notice';
import {funnelSignal,funnelStep} from './funnel';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DateTimePicker} from './DateTimePicker';
import {WeeklyAvailability} from './WeeklyAvailability';
import {fieldsRange,rangeFields,selectionAvailability,selectionDrift,type ConfirmRange} from './confirm-selection.mjs';
import {bestTimes} from './best-times.mjs';
import './confirmation-panel.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import type {WwmTranslate} from '@/i18n/wwm.mjs';
import {rsvpCounts,type RsvpStatus} from './rsvp.mjs';
import {useMediaQuery} from './use-media-query';

export type ConfirmationMember={id:string;name:string;response:'available'|'partial'|'unavailable'|'not-responded';email?:string;availability?:string};
type Slot={id:string;utc:string;date:string;time:string};
type SavedResponse={userId:string;displayName:string;slots:string[]};
export type ConfirmedAttendee={id:string;name:string;optional:boolean;rsvp?:RsvpStatus};
/** `attendees`/`recipientCount` are owner-only (members never receive the roster); `rsvp` is true when Google replies could be read. */
export type ConfirmationRecord={title?:string;date:string;start:string;end:string;timezone:string;organizer:string;attendeeNames:string[];attendees?:ConfirmedAttendee[];rsvp?:boolean;recipientCount?:number;eventUrl?:string;updated?:boolean;isRecipient?:boolean|null};
export type ConfirmationProposal={date:string;start:string;end:string;startId:string;endId:string;recipientIds:string[];excludedIds:string[];title:string;optionalIds:string[]};
/** Owner editing of a confirmed meeting. `initial` is the confirmed snapshot; status is the edit request, not the meeting. */
export type ConfirmationEditState={initial:{title:string;date:string;start:string;end:string;excludedIds:string[];optionalIds:string[]};status:'idle'|'pending'|'reconciling'|'failed'|'saved';error?:string};
export type ConfirmationPanelProps={room:{title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string};role:'owner'|'member';members?:ConfirmationMember[];slots:Slot[];responses:SavedResponse[];currentUserId:string;organizerEmail?:string;calendar:'connected'|'disconnected'|'connecting'|'error';status:'draft'|'pending'|'reconciling'|'failed'|'confirmed';confirmation?:ConfirmationRecord;error?:string;onRetry?:()=>void;onConnectCalendar:()=>void;onConfirm:(proposal:ConfirmationProposal)=>void;
 edit?:ConfirmationEditState;onEdit?:(proposal:ConfirmationProposal)=>void;onCheckEdit?:()=>void};
const clock=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
const responseLabel=(member:ConfirmationMember,t:WwmTranslate)=>member.response==='not-responded'?t('confirm.status.notResponded'):member.response==='unavailable'?t('confirm.status.unavailable'):member.response==='partial'?member.availability||t('confirm.status.partial'):t('confirm.status.available');
/** Response status as an icon; the label stays available to assistive tech and as a hover title. */
function ResponseIcon({member,t}:{member:ConfirmationMember;t:WwmTranslate}){
 const label=responseLabel(member,t);
 const Icon=member.response==='available'?CircleCheck:member.response==='partial'?Clock:member.response==='unavailable'?CircleX:CircleDashed;
 return <span className="wwm-response-icon" data-response={member.response} role="img" aria-label={label} title={label}><Icon aria-hidden="true"/></span>;
}
const sameSet=(a:string[],b:string[])=>a.length===b.length&&a.every(id=>b.includes(id));
const editFlow={idle:'draft',saved:'draft',pending:'pending',reconciling:'reconciling',failed:'failed'} as const;
export function ConfirmationPanel({room,role,members=[],slots,responses,currentUserId,organizerEmail,calendar,status,confirmation,error,onRetry,onConnectCalendar,onConfirm,edit,onEdit,onCheckEdit}:ConfirmationPanelProps){
 const {t,bestTimeLine,unavailableNames,confirmedWhen,dayTime,invitationsSentToast,memberInvitedLine,RSVP_LABELS,rsvpSummary,shortDay}=useWwmCopy();
 const names=(list:Array<{name:string}>)=>list.map(member=>member.name).join(t('common.listSeparator'));
 const [date,setDate]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[range,setRange]=useState<ConfirmRange|null>(null),[excludedIds,setExcludedIds]=useState<string[]>([]),[review,setReview]=useState(false),[sent,setSent]=useState(false),[eventTitle,setEventTitle]=useState(room.title),[optionalIds,setOptionalIds]=useState<string[]>([]);
 const [editing,setEditing]=useState(false),[manual,setManual]=useState(false),[showGrid,setShowGrid]=useState(false);
 // Availability for the chosen time when it was chosen; the review warns if saved availability has since dropped someone.
 const [baseline,setBaseline]=useState<ReturnType<typeof selectionAvailability<ConfirmationMember>>|null>(null);
 // Phones: the calendar comes first; the typed date/time fields fold into "Enter time manually".
 const compactLayout=useMediaQuery('(max-width: 640px)');
 const sentRef=useRef(false),previousStatus=useRef(status),reviewTrigger=useRef<HTMLButtonElement>(null),editTrigger=useRef<HTMLButtonElement>(null),refocusEdit=useRef(false);
 const owner=role==='owner';
 const recorded=confirmation&&status==='confirmed';
 const editMode=Boolean(owner&&recorded&&editing&&edit);
 // In edit mode the review/send controls follow the edit request; otherwise the first confirmation.
 const flowStatus=editMode&&edit?editFlow[edit.status]:status;
 useEffect(()=>{if(flowStatus==='failed'&&previousStatus.current!==flowStatus){sentRef.current=false;setSent(false)}previousStatus.current=flowStatus},[flowStatus]);
 // A saved edit closes the editor; the record above now shows the new details.
 useEffect(()=>{if(edit?.status==='saved'){setEditing(false);setReview(false);sentRef.current=false;setSent(false);refocusEdit.current=true}},[edit?.status]);
 // Leaving the editor (save or cancel) returns focus — and the viewport — to the record's Edit button.
 useEffect(()=>{if(!editing&&refocusEdit.current){refocusEdit.current=false;const timer=window.setTimeout(()=>editTrigger.current?.focus(),0);return()=>window.clearTimeout(timer)}},[editing]);
 const proposalValid=Boolean(date)&&Boolean(start)&&Boolean(end)&&date>=room.startDate&&date<=room.endDate&&clock(start)>=clock(room.startTime)&&clock(end)<=clock(room.endTime)&&clock(end)>clock(start)&&Boolean(range);
 const recipients=useMemo(()=>members.filter(member=>!excludedIds.includes(member.id)),[members,excludedIds]);
 const missing=recipients.filter(member=>!member.email);
 // Review statuses come from saved slots for the selected range (a response elsewhere in the room is not availability).
 const reviewed=useMemo(()=>selectionAvailability(members,responses,slots,range,t),[members,responses,slots,range,t]);
 const byResponse=(response:ConfirmationMember['response'])=>reviewed.filter(member=>member.response===response);
 const drifted=selectionDrift(baseline,reviewed);
 // Drop-off tracking (funnel.ts): picked a time, opened the review, backed out of it.
 const reviewOpened=useRef(false);
 useEffect(()=>{if(range)funnelStep('confirm','time_selected')},[range]);
 useEffect(()=>{if(review){reviewOpened.current=true;funnelStep('confirm','review_open',{recipient_count:recipients.length})}else if(reviewOpened.current){reviewOpened.current=false;if(!sent)funnelSignal('confirm','review_back')}},[review]);
 // Owner suggestions from saved availability (room bounds come from the slots; 30-minute minimum).
 const suggestions=useMemo(()=>owner?bestTimes({slots,responses,members}):[],[owner,slots,responses,members]);
 const busy=flowStatus==='pending'||flowStatus==='reconciling';
 // Only an in-flight request locks the dialog; a reconciling result can be closed and checked again later.
 const locked=flowStatus==='pending';
 const retry=editMode?onCheckEdit:onRetry;
 const checkAgain=flowStatus==='reconciling'&&retry?<Button type="button" variant="outline" size="sm" className="wwm-confirm-retry" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_CHECK_AGAIN} onClick={retry}>{t('confirm.checkAgain')}</Button>:null;
 const initial=edit?.initial;
 const unchanged=editMode&&initial?eventTitle.trim()===initial.title&&date===initial.date&&start===initial.start&&end===initial.end&&sameSet(excludedIds,initial.excludedIds)&&sameSet(optionalIds.filter(id=>!excludedIds.includes(id)),initial.optionalIds):false;
 function resetSent(){sentRef.current=false;setSent(false)}
 const snapshot=(next:ConfirmRange|null)=>setBaseline(next?selectionAvailability(members,responses,slots,next,t):null);
 // The calendar and the date/time fields edit one selection: calendar → fields, fields → slot-id range.
 function selectRange(next:ConfirmRange){if(busy)return;const fields=rangeFields(slots,next);if(!fields)return;setRange(next);snapshot(next);setDate(fields.date);setStart(fields.start);setEnd(fields.end);resetSent()}
 function changeFields(next:{date:string;start:string;end:string}){const nextRange=fieldsRange(slots,next);setDate(next.date);setStart(next.start);setEnd(next.end);setRange(nextRange);snapshot(nextRange);resetSent()}
 function changeStart(value:string){changeFields({date,start:value,end:end&&clock(end)<=clock(value)?'':end})}
 function startEdit(){if(!initial)return;setEventTitle(initial.title);changeFields({date:initial.date,start:initial.start,end:initial.end});setExcludedIds(initial.excludedIds);setOptionalIds(initial.optionalIds);setReview(false);setEditing(true)}
 function cancelEdit(){refocusEdit.current=true;setEditing(false);setReview(false);resetSent()}
 const confirmedRange=useMemo(()=>confirmation?fieldsRange(slots,confirmation):null,[confirmation,slots]);
 const calendarView=(selection:React.ComponentProps<typeof WeeklyAvailability>['selection'])=>selection&&<WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={responses} currentUserId={currentUserId} selection={selection}/>;
 function send(){if(!owner||busy||sentRef.current||calendar!=='connected'||!proposalValid||!eventTitle.trim()||missing.length||!recipients.length||!organizerEmail||unchanged){return;}sentRef.current=true;setSent(true);if(!range)return;const proposal={date,start,end,startId:range.startId,endId:range.endId,recipientIds:recipients.map(m=>m.id),excludedIds:members.filter(m=>excludedIds.includes(m.id)).map(m=>m.id),title:eventTitle.trim(),optionalIds:optionalIds.filter(id=>recipients.some(m=>m.id===id))};if(editMode)onEdit?.(proposal);else onConfirm(proposal)}
 const editBusy=edit?.status==='pending'||edit?.status==='reconciling';
 // The confirmed card: one status, the sent event name, one time line, who was invited and the next step.
 const roster=confirmation?.attendees??[];
 const replies=confirmation?.rsvp?rsvpCounts(roster.map(row=>({response:row.rsvp}))):null;
 const invitedLine=owner?(typeof confirmation?.recipientCount==='number'?invitationsSentToast(confirmation.recipientCount):t('confirmed.invitationsSent')):memberInvitedLine(confirmation?.isRecipient??null,confirmation?.organizer);
 const record=recorded&&<Card role="article" className="wwm-confirmed" aria-labelledby="wwm-confirmed-title">
  <p className="wwm-confirmed-status"><Check aria-hidden="true"/>{t('confirmed.status')}</p>
  <h2 id="wwm-confirmed-title">{confirmation.title||room.title}</h2>
  <p className="wwm-confirmed-when">{confirmedWhen(confirmation)}</p>
  <p className="wwm-confirmed-invited">{invitedLine}</p>
  {confirmation.updated&&<p className="wwm-confirmed-invited">{t('confirmed.updatedByOrganizer')}</p>}
  {(confirmation.eventUrl||owner&&edit)&&<div className="wwm-confirmed-actions">
   {confirmation.eventUrl&&<Button asChild><a href={confirmation.eventUrl} target="_blank" rel="noopener noreferrer" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EVENT_LINK}>{t('confirmed.openInCalendar')}<ExternalLink aria-hidden="true"/><span className="wwm-sr-only"> {t('common.opensInNewTab')}</span></a></Button>}
   {owner&&edit&&!editMode&&<Button ref={editTrigger} type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EDIT} disabled={editBusy} onClick={startEdit}>{t('confirmed.editMeeting')}</Button>}
  </div>}
  {owner&&edit&&!editMode&&edit.status==='reconciling'&&<Notice tone="pending" action={onCheckEdit&&<Button type="button" variant="outline" size="sm" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_CHECK_AGAIN} onClick={onCheckEdit}>{t('confirm.checkAgain')}</Button>}>{t('edit.reconciling')}</Notice>}
  {owner&&edit&&!editMode&&edit.status==='failed'&&edit.error&&<Notice tone="error">{edit.error}</Notice>}
  {owner&&roster.length>0&&<section className="wwm-confirmed-people" aria-labelledby="wwm-confirmed-people-title">
   <div className="wwm-confirmed-people-head"><h3 id="wwm-confirmed-people-title">{t('confirmed.attendees')}</h3>{replies&&<p>{rsvpSummary(replies)}</p>}</div>
   <ul>{roster.map(row=><li key={row.id}><span className="wwm-confirmed-name">{row.name}{row.optional&&<Badge variant="outline" size="sm" className="wwm-confirmed-tag">{t('common.optional')}</Badge>}</span>{row.rsvp&&(()=>{const Icon=row.rsvp==='accepted'?CircleCheck:row.rsvp==='declined'?CircleX:row.rsvp==='tentative'?CircleHelp:CircleDashed;return <span className="wwm-confirmed-rsvp" data-rsvp={row.rsvp} role="img" aria-label={RSVP_LABELS[row.rsvp]} title={RSVP_LABELS[row.rsvp]}><Icon aria-hidden="true"/></span>})()}</li>)}</ul>
  </section>}
 </Card>;
 // Under a confirmed meeting the grid is reference only: folded away until asked for.
 const availability=<Collapsible open={showGrid} onOpenChange={setShowGrid} className="wwm-confirmed-availability"><CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_SHOW_AVAILABILITY}>{showGrid?t('confirmed.hideAvailability'):t('confirmed.showAvailability')}{showGrid?<ChevronUp aria-hidden="true"/>:<ChevronDown aria-hidden="true"/>}</Button></CollapsibleTrigger><CollapsibleContent id="wwm-confirmed-grid">{showGrid&&calendarView({memberCount:members.length,range:confirmedRange,rangeLabel:t('common.confirmed')})}</CollapsibleContent></Collapsible>;
 const fields=<fieldset className="wwm-confirm-controls" disabled={busy}><DateTimePicker kind="date" label={t('confirm.meetingDate')} value={date} min={room.startDate} max={room.endDate} onChange={value=>changeFields({date:value,start,end})}/><DateTimePicker kind="time" label={t('confirm.start')} example={t('picker.timeExampleStart')} value={start} min={room.startTime} max={room.endTime==='24:00'?'23:30':room.endTime} onChange={changeStart}/><DateTimePicker kind="time" label={t('confirm.end')} example={t('picker.timeExampleEnd')} value={end} minTime={start||room.startTime} max={room.endTime} onChange={value=>changeFields({date,start,end:value})}/></fieldset>;
 return <section className="wwm-confirm" aria-label={t('confirm.region')} data-analytics-section={ANALYTICS_SECTIONS.WWM_CONFIRM}>
  {recorded&&!editMode?<>{record}{availability}</>:
  !owner?<><Card className="wwm-confirmed wwm-confirmed-waiting"><p className="wwm-confirmed-status"><Clock aria-hidden="true"/>{t('confirmed.notConfirmedYet')}</p><h2>{t('confirmed.waitingForOrganizer')}</h2><p className="wwm-confirmed-invited">{status==='reconciling'?t('confirmed.organizerSending'):t('confirmed.organizerWillChoose')}</p></Card>{calendarView({memberCount:members.length,range:null})}</>:
  <>{editMode&&confirmation?<header className="wwm-confirm-heading"><div><p className="wwm-confirmed-status"><Check aria-hidden="true"/>{t('confirmed.chip',{day:confirmedWhen(confirmation)})}</p><h2>{t('edit.title')}</h2><p>{t('edit.hint')}</p></div></header>:<header className="wwm-confirm-heading"><div><h2>{t('confirm.heading')}</h2></div></header>}
   {!compactLayout&&fields}
   {suggestions.length>0&&<Card role="region" className="wwm-best-times" aria-labelledby="wwm-best-times-title"><h3 id="wwm-best-times-title">{t('confirm.bestTimes')}</h3><TooltipProvider delayDuration={150}><ul>{suggestions.map(option=>{const chosen=range?.startId===option.startId&&range?.endId===option.endId;const who=unavailableNames(option.missing);const card=<Button type="button" variant="outline" className="wwm-best-time" aria-pressed={chosen} disabled={busy} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_CELL} data-analytics-id="best-time" onClick={()=>selectRange({date:option.date,startId:option.startId,endId:option.endId})}><strong>{dayTime(option)}</strong><small>{bestTimeLine(option)}</small>{who&&<span className="wwm-sr-only">{who}</span>}</Button>;return <li key={option.startId}>{who?<Tooltip><TooltipTrigger asChild>{card}</TooltipTrigger><TooltipContent side="top">{who}</TooltipContent></Tooltip>:card}</li>})}</ul></TooltipProvider></Card>}
   {calendarView({memberCount:members.length,range,rangeLabel:editMode?t('edit.newTime'):t('grid.selected'),onChange:busy?undefined:selectRange})}
   {compactLayout&&<Collapsible open={manual} onOpenChange={setManual} className="wwm-confirm-manual"><CollapsibleTrigger asChild><Button type="button" variant="ghost" size="sm" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_MANUAL_TIME}>{t('confirm.enterManually')}{manual?<ChevronUp aria-hidden="true"/>:<ChevronDown aria-hidden="true"/>}</Button></CollapsibleTrigger><CollapsibleContent id="wwm-confirm-manual-fields">{fields}</CollapsibleContent></Collapsible>}
   {flowStatus==='failed'&&<Notice tone="error">{(editMode?edit?.error:error)||t('confirm.sendFailed')}</Notice>}
   {flowStatus==='reconciling'&&<Notice tone="pending" action={checkAgain}>{retry?t('confirm.reconciling'):t('confirm.reconcilingNoRetry')}</Notice>}
   {/* The sticky footer appears once a time is chosen; in edit mode Cancel stays reachable. */}
   <p className="wwm-sr-only" aria-live="polite">{range&&proposalValid?dayTime({date,start,end}):''}</p>
   {(range&&proposalValid||editMode)&&<div className="wwm-confirm-actions"><p aria-hidden="true">{range&&proposalValid?<strong>{dayTime({date,start,end})}</strong>:t('edit.chooseNewTime')}</p><div className="wwm-confirm-action-buttons">{editMode&&<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EDIT_CANCEL} disabled={locked} onClick={cancelEdit}>{t('common.cancel')}</Button>}<Button ref={reviewTrigger} type="button" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_REVIEW} disabled={!proposalValid||busy} onClick={()=>setReview(true)}>{editMode?t('edit.review'):t('confirm.review')}</Button></div></div>}
   <Dialog open={review} onOpenChange={open=>{if(!locked){setReview(open)}}}><DialogContent className="wwm-confirm-dialog" closeLabel={t('common.close')} showCloseButton={!locked} onCloseAutoFocus={event=>{event.preventDefault();reviewTrigger.current?.focus()}}><DialogHeader><DialogTitle>{editMode?t('edit.reviewTitle'):t('confirm.reviewTitle')}</DialogTitle><DialogDescription>{editMode?t('edit.reviewDescription'):t('confirm.reviewDescription')}</DialogDescription></DialogHeader><div className="wwm-confirm-dialog-body">
    <div className="wwm-labeled-field wwm-confirm-title"><RequiredFieldLabel required htmlFor="wwm-confirm-title">{t('confirm.eventName')}</RequiredFieldLabel><Input id="wwm-confirm-title" required maxLength={100} value={eventTitle} disabled={busy} aria-invalid={!eventTitle.trim()} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EVENT_TITLE} onChange={event=>{setEventTitle(event.target.value);resetSent()}}/></div>
    <dl className="wwm-confirm-facts">{editMode&&confirmation&&<div><dt>{t('edit.was')}</dt><dd>{dayTime(confirmation)}</dd></div>}<div><dt>{t('common.date')}</dt><dd>{shortDay(date)}</dd></div><div><dt>{t('common.time')}</dt><dd>{start}–{end} · {room.timezone}</dd></div><div><dt>{t('common.organizer')}</dt><dd>{organizerEmail||t('confirm.organizerUnavailable')}</dd></div></dl>
    {drifted&&<Notice tone="warning">{t('confirm.warnings.noLongerWorks')}</Notice>}
    <h3>{t('confirm.recipients',{count:recipients.length})}</h3><ul className="wwm-confirm-roster">{reviewed.map(member=><li key={member.id}><label className="wwm-confirm-recipient" htmlFor={`wwm-recipient-${member.id}`}><Checkbox id={`wwm-recipient-${member.id}`} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RECIPIENT} checked={!excludedIds.includes(member.id)} disabled={busy} onCheckedChange={()=>{setExcludedIds(current=>current.includes(member.id)?current.filter(id=>id!==member.id):[...current,member.id]);setOptionalIds(current=>current.filter(id=>id!==member.id));resetSent()}}/><span><strong>{member.name}<ResponseIcon member={member} t={t}/></strong><small>{member.email||t('confirm.missingEmail')}{excludedIds.includes(member.id)?` · ${t('confirm.excludedTag')}`:optionalIds.includes(member.id)?` · ${t('common.optional')}`:''}</small></span></label>{!excludedIds.includes(member.id)&&<Button type="button" variant="ghost" size="sm" className="wwm-confirm-optional" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RECIPIENT_OPTIONAL} aria-pressed={optionalIds.includes(member.id)} aria-label={t('confirm.markOptional',{name:member.name})} disabled={busy} onClick={()=>{setOptionalIds(current=>current.includes(member.id)?current.filter(id=>id!==member.id):[...current,member.id]);resetSent()}}>{t('common.optional')}</Button>}</li>)}</ul>
    {missing.length>0&&<p className="wwm-confirm-error" role="alert">{t('confirm.warnings.missingEmail',{names:names(missing)})}</p>}
    {byResponse('unavailable').length>0&&<Notice tone="warning">{t('confirm.warnings.unavailable',{names:names(byResponse('unavailable'))})}</Notice>}
    {byResponse('partial').length>0&&<p className="wwm-confirm-warning">{t('confirm.warnings.partly',{names:byResponse('partial').map(member=>`${member.name} (${responseLabel(member,t)})`).join(t('common.listSeparator'))})}</p>}
    {byResponse('not-responded').length>0&&<p className="wwm-confirm-warning">{t('confirm.warnings.notResponded',{names:names(byResponse('not-responded'))})}</p>}
    {optionalIds.length>0&&<p className="wwm-confirm-note">{t('confirm.warnings.optional',{names:names(members.filter(m=>optionalIds.includes(m.id)))})}</p>}
    {excludedIds.length>0&&<p className="wwm-confirm-warning">{t('confirm.warnings.excluded',{names:names(members.filter(m=>excludedIds.includes(m.id)))})}</p>}
    {unchanged&&<p className="wwm-confirm-note">{t('edit.noChanges')}</p>}
    {calendar!=='connected'&&<div className="wwm-confirm-consent"><p>{t('confirm.consent')}</p><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_CONNECT} disabled={calendar==='connecting'||busy} onClick={onConnectCalendar}>{t('fill.connectGoogleCalendar')}</Button></div>}
    {flowStatus==='failed'&&<Notice tone="error">{(editMode?edit?.error:error)||t('confirm.sendFailed')}</Notice>}
    {busy&&<Notice tone="pending" action={checkAgain}>{flowStatus==='reconciling'?t('confirm.reconciling'):editMode?t('edit.saving'):t('confirm.sending')}</Notice>}
    {sent&&!busy&&flowStatus==='draft'&&<p role="status">{t('confirm.submitted')}</p>}
   </div><DialogFooter className="wwm-confirm-footer"><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={locked} onClick={()=>setReview(false)}>{t('common.back')}</Button>{editMode?<Button type="button" disabled={!proposalValid||!eventTitle.trim()||busy||sentRef.current||calendar!=='connected'||Boolean(missing.length)||!recipients.length||!organizerEmail||unchanged} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EDIT_SAVE} onClick={send}>{t('edit.save')}</Button>:<Button type="button" disabled={!proposalValid||!eventTitle.trim()||busy||sentRef.current||calendar!=='connected'||Boolean(missing.length)||!recipients.length||!organizerEmail} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_SEND} onClick={send}>{flowStatus==='failed'?t('confirm.sendRetry'):t('confirm.send')}</Button>}</DialogFooter></DialogContent></Dialog>
  </>}
 </section>;
}
