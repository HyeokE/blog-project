'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Checkbox} from '@/components/ui/checkbox';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DateTimePicker} from './DateTimePicker';
import {WeeklyAvailability} from './WeeklyAvailability';
import {fieldsRange,rangeFields,selectionAvailability,type ConfirmRange} from './confirm-selection.mjs';
import './confirmation-panel.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';

export type ConfirmationMember={id:string;name:string;response:'available'|'partial'|'unavailable'|'not-responded';email?:string;availability?:string};
type Slot={id:string;utc:string;date:string;time:string};
type SavedResponse={userId:string;displayName:string;slots:string[]};
export type ConfirmationRecord={title?:string;date:string;start:string;end:string;timezone:string;organizer:string;attendeeNames:string[];eventUrl?:string;updated?:boolean};
export type ConfirmationProposal={date:string;start:string;end:string;startId:string;endId:string;recipientIds:string[];excludedIds:string[];title:string;optionalIds:string[]};
/** Owner editing of a confirmed meeting. `initial` is the confirmed snapshot; status is the edit request, not the meeting. */
export type ConfirmationEditState={initial:{title:string;date:string;start:string;end:string;excludedIds:string[];optionalIds:string[]};status:'idle'|'pending'|'reconciling'|'failed'|'saved';error?:string};
export type ConfirmationResendState={status:'idle'|'pending'|'sent'|'failed';message?:string};
export type ConfirmationPanelProps={room:{title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string};role:'owner'|'member';members?:ConfirmationMember[];slots:Slot[];responses:SavedResponse[];currentUserId:string;organizerEmail?:string;calendar:'connected'|'disconnected'|'connecting'|'error';status:'draft'|'pending'|'reconciling'|'failed'|'confirmed';confirmation?:ConfirmationRecord;error?:string;onRetry?:()=>void;onConnectCalendar:()=>void;onConfirm:(proposal:ConfirmationProposal)=>void;
 edit?:ConfirmationEditState;onEdit?:(proposal:ConfirmationProposal)=>void;onCheckEdit?:()=>void;resend?:ConfirmationResendState;onResend?:()=>void};
const clock=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
const label=(date:string)=>date.replaceAll('-','.');
const responseLabel=(member:ConfirmationMember)=>member.response==='not-responded'?'Not responded':member.response==='unavailable'?'Unavailable':member.response==='partial'?member.availability||'Partly available':'Available';
const names=(list:ConfirmationMember[])=>list.map(member=>member.name).join(', ');
const sameSet=(a:string[],b:string[])=>a.length===b.length&&a.every(id=>b.includes(id));
const editFlow={idle:'draft',saved:'draft',pending:'pending',reconciling:'reconciling',failed:'failed'} as const;
export function ConfirmationPanel({room,role,members=[],slots,responses,currentUserId,organizerEmail,calendar,status,confirmation,error,onRetry,onConnectCalendar,onConfirm,edit,onEdit,onCheckEdit,resend,onResend}:ConfirmationPanelProps){
 const [date,setDate]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[range,setRange]=useState<ConfirmRange|null>(null),[excludedIds,setExcludedIds]=useState<string[]>([]),[review,setReview]=useState(false),[sent,setSent]=useState(false),[eventTitle,setEventTitle]=useState(room.title),[optionalIds,setOptionalIds]=useState<string[]>([]);
 const [editing,setEditing]=useState(false);
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
 const reviewed=useMemo(()=>selectionAvailability(members,responses,slots,range),[members,responses,slots,range]);
 const byResponse=(response:ConfirmationMember['response'])=>reviewed.filter(member=>member.response===response);
 const busy=flowStatus==='pending'||flowStatus==='reconciling';
 // Only an in-flight request locks the dialog; a reconciling result can be closed and checked again later.
 const locked=flowStatus==='pending';
 const retry=editMode?onCheckEdit:onRetry;
 const checkAgain=flowStatus==='reconciling'&&retry?<Button type="button" variant="outline" className="wwm-confirm-retry" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_CHECK_AGAIN} onClick={retry}>Check again</Button>:null;
 const initial=edit?.initial;
 const unchanged=editMode&&initial?eventTitle.trim()===initial.title&&date===initial.date&&start===initial.start&&end===initial.end&&sameSet(excludedIds,initial.excludedIds)&&sameSet(optionalIds.filter(id=>!excludedIds.includes(id)),initial.optionalIds):false;
 function resetSent(){sentRef.current=false;setSent(false)}
 // The calendar and the date/time fields edit one selection: calendar → fields, fields → slot-id range.
 function selectRange(next:ConfirmRange){if(busy)return;const fields=rangeFields(slots,next);if(!fields)return;setRange(next);setDate(fields.date);setStart(fields.start);setEnd(fields.end);resetSent()}
 function changeFields(next:{date:string;start:string;end:string}){setDate(next.date);setStart(next.start);setEnd(next.end);setRange(fieldsRange(slots,next));resetSent()}
 function changeStart(value:string){changeFields({date,start:value,end:end&&clock(end)<=clock(value)?'':end})}
 function startEdit(){if(!initial)return;setEventTitle(initial.title);changeFields({date:initial.date,start:initial.start,end:initial.end});setExcludedIds(initial.excludedIds);setOptionalIds(initial.optionalIds);setReview(false);setEditing(true)}
 function cancelEdit(){refocusEdit.current=true;setEditing(false);setReview(false);resetSent()}
 const confirmedRange=useMemo(()=>confirmation?fieldsRange(slots,confirmation):null,[confirmation,slots]);
 const calendarView=(selection:React.ComponentProps<typeof WeeklyAvailability>['selection'])=>selection&&<WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={responses} currentUserId={currentUserId} selection={selection}/>;
 function send(){if(!owner||busy||sentRef.current||calendar!=='connected'||!proposalValid||!eventTitle.trim()||missing.length||!recipients.length||!organizerEmail||unchanged){return;}sentRef.current=true;setSent(true);if(!range)return;const proposal={date,start,end,startId:range.startId,endId:range.endId,recipientIds:recipients.map(m=>m.id),excludedIds:members.filter(m=>excludedIds.includes(m.id)).map(m=>m.id),title:eventTitle.trim(),optionalIds:optionalIds.filter(id=>recipients.some(m=>m.id===id))};if(editMode)onEdit?.(proposal);else onConfirm(proposal)}
 const editBusy=edit?.status==='pending'||edit?.status==='reconciling';
 const record=recorded&&<div className="wwm-confirm-record"><h2>Confirmed meeting</h2><strong>{confirmation.title||room.title}</strong><p>{label(confirmation.date)} · {confirmation.start}–{confirmation.end} · {confirmation.timezone}</p><p>Organizer: {confirmation.organizer}</p>{confirmation.attendeeNames.length>0&&<p>Attendees: {confirmation.attendeeNames.join(', ')}</p>}{confirmation.updated&&<p className="wwm-confirm-updated">Updated by the organizer after the first invitation. These are the latest details.</p>}<p>Invitations requested; delivery is not guaranteed.</p>{confirmation.eventUrl&&<a href={confirmation.eventUrl} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EVENT_LINK} target="_blank" rel="noopener noreferrer">View Google Calendar event</a>}
  {owner&&edit&&!editMode&&<><div className="wwm-confirm-record-actions"><Button ref={editTrigger} type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EDIT} disabled={editBusy||resend?.status==='pending'} onClick={startEdit}>Edit meeting</Button>{onResend&&<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RESEND} disabled={editBusy||resend?.status==='pending'} onClick={onResend}>{resend?.status==='pending'?'Resending…':'Resend invitations'}</Button>}</div>
   {edit.status==='reconciling'&&<div className="wwm-confirm-status"><p role="status">Saving your changes to Google Calendar. Checking again never notifies attendees twice.</p>{onCheckEdit&&<Button type="button" variant="outline" className="wwm-confirm-retry" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_CHECK_AGAIN} onClick={onCheckEdit}>Check again</Button>}</div>}
   {edit.status==='saved'&&<p role="status" className="wwm-confirm-note">Changes saved. Google Calendar notified the attendees.</p>}
   {edit.status==='failed'&&edit.error&&<p role="alert" className="wwm-confirm-error">{edit.error}</p>}
   {resend?.status==='sent'&&<p role="status" className="wwm-confirm-note">Invitations re-sent. Google Calendar emails the attendees again.</p>}
   {resend?.status==='failed'&&<p role="alert" className="wwm-confirm-error">{resend.message||'Could not resend invitations.'}</p>}</>}
 </div>;
 return <section className="wwm-confirm" aria-label="Meeting confirmation" data-analytics-section={ANALYTICS_SECTIONS.WWM_CONFIRM}>
  {recorded&&!editMode?<>{record}{calendarView({memberCount:members.length,range:confirmedRange,rangeLabel:'Confirmed'})}</>:
  !owner?<><div className="wwm-confirm-record"><h2>Meeting not confirmed yet</h2><p>{status==='reconciling'?'The organizer is sending invitations. Check back shortly.':'The organizer will choose a time and send invitations.'}</p></div>{calendarView({memberCount:members.length,range:null})}</>:
  <>{editMode&&confirmation?<header className="wwm-confirm-heading"><div><h2>Edit confirmed meeting</h2><p>Now: {label(confirmation.date)} · {confirmation.start}–{confirmation.end} · {room.timezone}</p></div></header>:<header className="wwm-confirm-heading"><div><h2>Confirm a time</h2><p>{label(room.startDate)} – {label(room.endDate)} · {room.timezone}</p></div></header>}
   <p className="wwm-confirm-note">Availability counts use all {members.length} members; missing responses are not treated as unavailable.</p>
   <fieldset className="wwm-confirm-controls" disabled={busy}><DateTimePicker kind="date" label="Meeting date" value={date} min={room.startDate} max={room.endDate} onChange={value=>changeFields({date:value,start,end})}/><DateTimePicker kind="time" label="Start" value={start} min={room.startTime} max={room.endTime==='24:00'?'23:30':room.endTime} onChange={changeStart}/><DateTimePicker kind="time" label="End" value={end} minTime={start||room.startTime} max={room.endTime} onChange={value=>changeFields({date,start,end:value})}/></fieldset>
   {calendarView({memberCount:members.length,range,rangeLabel:editMode?'New time':'Selected',onChange:busy?undefined:selectRange})}
   {flowStatus==='failed'&&<p role="alert" className="wwm-confirm-error">{(editMode?edit?.error:error)||'Confirmation failed. Review the details before trying again.'}</p>}
   {flowStatus==='reconciling'&&<div className="wwm-confirm-status"><p role="status">{retry?'Checking event status. Checking again never sends invitations twice.':'Checking event status. Please do not retry yet.'}</p>{checkAgain}</div>}
   <div className="wwm-confirm-actions"><p aria-live="polite">{range&&proposalValid?<><strong>{label(date)} · {start}–{end}</strong><span>{editMode?'Nothing changes until you save.':'Selection alone does not send invitations.'}</span></>:'Choose one date and a start and end time on the calendar or in the fields.'}</p><div className="wwm-confirm-action-buttons">{editMode&&<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EDIT_CANCEL} disabled={locked} onClick={cancelEdit}>Cancel</Button>}<Button ref={reviewTrigger} type="button" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_REVIEW} disabled={!proposalValid||busy} onClick={()=>setReview(true)}>{editMode?'Review changes':'Review confirmation'}</Button></div></div>
   <Dialog open={review} onOpenChange={open=>{if(!locked){setReview(open)}}}><DialogContent className="wwm-confirm-dialog" showCloseButton={!locked} onCloseAutoFocus={event=>{event.preventDefault();reviewTrigger.current?.focus()}}><DialogHeader><DialogTitle>{editMode?'Review changes':'Review confirmation'}</DialogTitle><DialogDescription>{editMode?'Google Calendar updates the same event and emails attendees about the change. Removed recipients receive a cancellation.':'Check the exact time and recipients before requesting invitations.'}</DialogDescription></DialogHeader><div className="wwm-confirm-dialog-body">
    <div className="wwm-labeled-field wwm-confirm-title"><RequiredFieldLabel required htmlFor="wwm-confirm-title">Event name</RequiredFieldLabel><Input id="wwm-confirm-title" required maxLength={100} value={eventTitle} disabled={busy} aria-invalid={!eventTitle.trim()} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EVENT_TITLE} onChange={event=>{setEventTitle(event.target.value);resetSent()}}/></div>
    <dl className="wwm-confirm-facts">{editMode&&confirmation&&<div><dt>Was</dt><dd>{label(confirmation.date)} · {confirmation.start}–{confirmation.end}</dd></div>}<div><dt>Date</dt><dd>{label(date)}</dd></div><div><dt>Time</dt><dd>{start}–{end} · {room.timezone}</dd></div><div><dt>Organizer account</dt><dd>{organizerEmail||'Not available'}</dd></div><div><dt>Members</dt><dd>{members.length}</dd></div></dl>
    <h3>Recipients ({recipients.length})</h3><ul className="wwm-confirm-roster">{reviewed.map(member=><li key={member.id}><label className="wwm-confirm-recipient" htmlFor={`wwm-recipient-${member.id}`}><Checkbox id={`wwm-recipient-${member.id}`} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RECIPIENT} checked={!excludedIds.includes(member.id)} disabled={busy} onCheckedChange={()=>{setExcludedIds(current=>current.includes(member.id)?current.filter(id=>id!==member.id):[...current,member.id]);setOptionalIds(current=>current.filter(id=>id!==member.id));resetSent()}}/><span><strong>{member.name}</strong><small>{member.email||'Missing email'} · {responseLabel(member)}{excludedIds.includes(member.id)?' · Excluded':optionalIds.includes(member.id)?' · Optional':''}</small></span></label>{!excludedIds.includes(member.id)&&<Button type="button" variant="outline" className="wwm-confirm-optional" data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_RECIPIENT_OPTIONAL} aria-pressed={optionalIds.includes(member.id)} aria-label={`Mark ${member.name} as optional`} disabled={busy} onClick={()=>{setOptionalIds(current=>current.includes(member.id)?current.filter(id=>id!==member.id):[...current,member.id]);resetSent()}}>Optional</Button>}</li>)}</ul>
    {missing.length>0&&<p className="wwm-confirm-error" role="alert">Missing email for {missing.map(m=>m.name).join(', ')}. Exclude these members explicitly before sending.</p>}
    {byResponse('unavailable').length>0&&<p className="wwm-confirm-warning">Unavailable: {names(byResponse('unavailable'))}</p>}
    {byResponse('partial').length>0&&<p className="wwm-confirm-warning">Partly available: {byResponse('partial').map(member=>`${member.name} (${responseLabel(member)})`).join(', ')}</p>}
    {byResponse('not-responded').length>0&&<p className="wwm-confirm-warning">Not responded: {names(byResponse('not-responded'))}</p>}
    {optionalIds.length>0&&<p className="wwm-confirm-note">Optional: {members.filter(m=>optionalIds.includes(m.id)).map(m=>m.name).join(', ')}</p>}
    {excludedIds.length>0&&<p className="wwm-confirm-warning">Excluded: {members.filter(m=>excludedIds.includes(m.id)).map(m=>m.name).join(', ')}</p>}
    {unchanged&&<p className="wwm-confirm-note">No changes to save yet.</p>}
    {calendar!=='connected'&&<div className="wwm-confirm-consent"><p>Connect the organizer’s Google Calendar before sending. Connecting does not send invitations. Review again after consent.</p><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.CALENDAR_CONNECT} disabled={calendar==='connecting'||busy} onClick={onConnectCalendar}>Connect Google Calendar</Button></div>}
    {flowStatus==='failed'&&<p role="alert" className="wwm-confirm-error">{(editMode?edit?.error:error)||'Unable to confirm. Review and try again.'}</p>}
    {busy&&<div className="wwm-confirm-status"><p role="status">{flowStatus==='reconciling'?'Checking event status':editMode?'Saving changes…':'Requesting invitations…'}</p>{checkAgain}</div>}
    {sent&&!busy&&flowStatus==='draft'&&<p role="status">Request submitted. Waiting for verified status.</p>}
   </div><DialogFooter className="wwm-confirm-footer"><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={locked} onClick={()=>setReview(false)}>Back</Button>{editMode?<Button type="button" disabled={!proposalValid||!eventTitle.trim()||busy||sentRef.current||calendar!=='connected'||Boolean(missing.length)||!recipients.length||!organizerEmail||unchanged} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_EDIT_SAVE} onClick={send}>Save &amp; notify attendees</Button>:<Button type="button" disabled={!proposalValid||!eventTitle.trim()||busy||sentRef.current||calendar!=='connected'||Boolean(missing.length)||!recipients.length||!organizerEmail} data-analytics-label={ANALYTICS_ELEMENTS.CONFIRM_SEND} onClick={send}>Confirm &amp; send invitations</Button>}</DialogFooter></DialogContent></Dialog>
  </>}
 </section>;
}
