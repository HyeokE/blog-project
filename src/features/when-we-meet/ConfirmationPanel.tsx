'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {DateTimePicker} from './DateTimePicker';
import './confirmation-panel.css';

export type ConfirmationMember={id:string;name:string;response:'available'|'unavailable'|'not-responded';email?:string};
export type ConfirmationSlot={date:string;time:string;available:number};
export type ConfirmationRecord={date:string;start:string;end:string;timezone:string;organizer:string;attendeeNames:string[];eventUrl?:string};
export type ConfirmationPanelProps={room:{title:string;startDate:string;endDate:string;startTime:string;endTime:string;timezone:string};role:'owner'|'member';members?:ConfirmationMember[];slots?:ConfirmationSlot[];organizerEmail?:string;calendar:'connected'|'disconnected'|'connecting'|'error';status:'draft'|'pending'|'reconciling'|'failed'|'confirmed';confirmation?:ConfirmationRecord;error?:string;onConnectCalendar:()=>void;onConfirm:(proposal:{date:string;start:string;end:string;recipientIds:string[];excludedIds:string[]})=>void};
const clock=(value:string)=>Number(value.slice(0,2))*60+Number(value.slice(3));
const label=(date:string)=>date.replaceAll('-','.');
const time=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
const datesBetween=(first:string,last:string)=>{const dates:string[]=[];let day=new Date(`${first}T12:00:00Z`);const lastDay=new Date(`${last}T12:00:00Z`);while(day<=lastDay&&dates.length<366){dates.push(day.toISOString().slice(0,10));day=new Date(day.getTime()+86400000)}return dates};
export function ConfirmationPanel({room,role,members=[],slots=[],organizerEmail,calendar,status,confirmation,error,onConnectCalendar,onConfirm}:ConfirmationPanelProps){
 const [date,setDate]=useState(''),[start,setStart]=useState(''),[end,setEnd]=useState(''),[excludedIds,setExcludedIds]=useState<string[]>([]),[review,setReview]=useState(false),[sent,setSent]=useState(false);
 const sentRef=useRef(false),previousStatus=useRef(status),ignoreClick=useRef(false),dragRef=useRef<{date:string;minute:number;pointer:number}|null>(null);
 const days=useMemo(()=>datesBetween(room.startDate,room.endDate),[room.startDate,room.endDate]);
 const first=Math.ceil(clock(room.startTime)/30)*30,last=Math.floor(clock(room.endTime)/30)*30;
 const rows=Array.from({length:Math.max(0,(last-first)/30)},(_,i)=>first+i*30);
 const counts=useMemo(()=>new Map(slots.map(slot=>[`${slot.date}-${slot.time}`,slot.available])),[slots]);
 useEffect(()=>{if(status==='failed'&&previousStatus.current!==status){sentRef.current=false;setSent(false)}previousStatus.current=status},[status]);
 const owner=role==='owner';
 const proposalValid=Boolean(date)&&Boolean(start)&&Boolean(end)&&date>=room.startDate&&date<=room.endDate&&clock(start)>=clock(room.startTime)&&clock(end)<=clock(room.endTime)&&clock(end)>clock(start);
 const recipients=useMemo(()=>members.filter(member=>!excludedIds.includes(member.id)),[members,excludedIds]);
 const missing=recipients.filter(member=>!member.email);
 const busy=status==='pending'||status==='reconciling';
 const recorded=confirmation&&status==='confirmed';
 function resetSent(){sentRef.current=false;setSent(false)}
 function selectRange(day:string,a:number,b:number){if(busy)return;setDate(day);setStart(time(Math.min(a,b)));setEnd(time(Math.min(last,Math.max(a,b)+30)));resetSent()}
 function changeStart(value:string){setStart(value);if(end&&clock(end)<=clock(value)){setEnd('');}resetSent()}
 function send(){if(!owner||busy||sentRef.current||calendar!=='connected'||!proposalValid||missing.length||!recipients.length||!organizerEmail){return;}sentRef.current=true;setSent(true);onConfirm({date,start,end,recipientIds:recipients.map(m=>m.id),excludedIds:members.filter(m=>excludedIds.includes(m.id)).map(m=>m.id)})}
 return <section className="wwm-confirm" aria-label="Meeting confirmation">
  {recorded?<div className="wwm-confirm-record"><h2>Confirmed meeting</h2><strong>{room.title}</strong><p>{label(confirmation.date)} · {confirmation.start}–{confirmation.end} · {confirmation.timezone}</p><p>Organizer: {confirmation.organizer}</p><p>Attendees: {confirmation.attendeeNames.join(', ')}</p><p>Invitations requested; delivery is not guaranteed.</p>{confirmation.eventUrl&&<a href={confirmation.eventUrl} target="_blank" rel="noopener noreferrer">View Google Calendar event</a>}</div>:
  !owner?<div className="wwm-confirm-record"><h2>Meeting not confirmed yet</h2><p>The organizer will choose a time and send invitations.</p></div>:
  <><header className="wwm-confirm-heading"><div><h2>Confirm a time</h2><p>{label(room.startDate)} – {label(room.endDate)} · {room.timezone}</p></div></header>
   <p className="wwm-confirm-note">Availability counts use all {members.length} members; missing responses are not treated as unavailable.</p>
   <div className="wwm-confirm-grid" role="group" aria-label="Aggregate availability calendar"><div className="wwm-confirm-calendar" style={{gridTemplateColumns:`64px repeat(${days.length}, minmax(110px,1fr))`}}><span className="wwm-confirm-corner"/>{days.map(day=><strong className="wwm-confirm-day" key={day}>{label(day)}</strong>)}{rows.map(minute=><div className="wwm-confirm-row" key={minute}><span className="wwm-confirm-axis">{time(minute)}</span>{days.map(day=>{const selected=date===day&&start&&end&&minute>=clock(start)&&minute<clock(end);return <button type="button" className={`wwm-confirm-cell${selected?' is-selected':''}`} key={day} disabled={busy} aria-label={`${label(day)} ${time(minute)}–${time(minute+30)}, ${counts.get(`${day}-${time(minute)}`)??0} of ${members.length} available`} aria-pressed={Boolean(selected)} onClick={()=>{if(ignoreClick.current){ignoreClick.current=false;return}selectRange(day,minute,minute)}} onPointerDown={event=>{if(event.pointerType==='touch'||busy)return;dragRef.current={date:day,minute,pointer:event.pointerId};event.currentTarget.setPointerCapture(event.pointerId);selectRange(day,minute,minute)}} onPointerMove={event=>{const drag=dragRef.current;if(!drag||drag.pointer!==event.pointerId)return;const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>('[data-confirm-day]');if(target?.dataset.confirmDay===drag.date){const targetMinute=Number(target.dataset.confirmMinute);if(Number.isFinite(targetMinute)){if(targetMinute!==drag.minute)ignoreClick.current=true;selectRange(day,drag.minute,targetMinute)}}}} onPointerUp={()=>{dragRef.current=null}} onLostPointerCapture={()=>{dragRef.current=null}} data-confirm-day={day} data-confirm-minute={minute}><strong>{counts.get(`${day}-${time(minute)}`)??0}/{members.length}</strong></button>})}</div>)}</div></div>
   <fieldset className="wwm-confirm-controls" disabled={busy}><DateTimePicker kind="date" label="Meeting date" value={date} min={room.startDate} max={room.endDate} onChange={value=>{setDate(value);resetSent()}}/><DateTimePicker kind="time" label="Start" value={start} min={room.startTime} max={room.endTime==='24:00'?'23:30':room.endTime} onChange={changeStart}/><DateTimePicker kind="time" label="End" value={end} minTime={start||room.startTime} max={room.endTime} onChange={value=>{setEnd(value);resetSent()}}/></fieldset>
   <p className="wwm-confirm-note">Choose one date and a start and end time. Selection alone does not send invitations.</p>
   {status==='failed'&&<p role="alert" className="wwm-confirm-error">{error||'Confirmation failed. Review the details before trying again.'}</p>}
   {status==='reconciling'&&<p role="status">Checking event status. Please do not retry yet.</p>}
   <Button type="button" disabled={!proposalValid||busy} onClick={()=>setReview(true)}>Review confirmation</Button>
   <Dialog open={review} onOpenChange={open=>{if(!busy){setReview(open)}}}><DialogContent className="wwm-confirm-dialog" showCloseButton={!busy}><DialogHeader><DialogTitle>Review confirmation</DialogTitle><DialogDescription>Check the exact time and recipients before requesting invitations.</DialogDescription></DialogHeader><div className="wwm-confirm-dialog-body">
    <dl className="wwm-confirm-facts"><div><dt>Meeting</dt><dd>{room.title}</dd></div><div><dt>Date</dt><dd>{label(date)}</dd></div><div><dt>Time</dt><dd>{start}–{end} · {room.timezone}</dd></div><div><dt>Organizer account</dt><dd>{organizerEmail||'Not available'}</dd></div><div><dt>Members</dt><dd>{members.length}</dd></div></dl>
    <h3>Recipients ({recipients.length})</h3><ul className="wwm-confirm-roster">{members.map(member=><li key={member.id}><label><input type="checkbox" checked={!excludedIds.includes(member.id)} disabled={busy} onChange={()=>{setExcludedIds(current=>current.includes(member.id)?current.filter(id=>id!==member.id):[...current,member.id]);resetSent()}}/><span><strong>{member.name}</strong><small>{member.email||'Missing email'} · {member.response==='not-responded'?'Not responded':member.response==='unavailable'?'Unavailable':'Available'}{excludedIds.includes(member.id)?' · Excluded':''}</small></span></label></li>)}</ul>
    {missing.length>0&&<p className="wwm-confirm-error" role="alert">Missing email for {missing.map(m=>m.name).join(', ')}. Exclude these members explicitly before sending.</p>}
    {members.some(m=>m.response==='not-responded')&&<p className="wwm-confirm-warning">Not responded: {members.filter(m=>m.response==='not-responded').map(m=>m.name).join(', ')}</p>}
    {members.some(m=>m.response==='unavailable')&&<p className="wwm-confirm-warning">Unavailable: {members.filter(m=>m.response==='unavailable').map(m=>m.name).join(', ')}</p>}
    {excludedIds.length>0&&<p className="wwm-confirm-warning">Excluded: {members.filter(m=>excludedIds.includes(m.id)).map(m=>m.name).join(', ')}</p>}
    {calendar!=='connected'&&<div className="wwm-confirm-consent"><p>Connect the organizer’s Google Calendar before sending. Connecting does not send invitations. Review again after consent.</p><Button type="button" variant="outline" disabled={calendar==='connecting'||busy} onClick={onConnectCalendar}>Connect Google Calendar</Button></div>}
    {status==='failed'&&<p role="alert" className="wwm-confirm-error">{error||'Unable to confirm. Review and try again.'}</p>}
    {busy&&<p role="status">{status==='reconciling'?'Checking event status':'Requesting invitations…'}</p>}
    {sent&&!busy&&status==='draft'&&<p role="status">Request submitted. Waiting for verified status.</p>}
   </div><DialogFooter className="wwm-confirm-footer"><Button type="button" variant="outline" disabled={busy} onClick={()=>setReview(false)}>Back</Button><Button type="button" disabled={!proposalValid||busy||sentRef.current||calendar!=='connected'||Boolean(missing.length)||!recipients.length||!organizerEmail} onClick={send}>Confirm &amp; send invitations</Button></DialogFooter></DialogContent></Dialog>
  </>}
 </section>;
}
