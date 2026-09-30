// User-facing copy and formatters for When We Meet. Pure: no DOM, no clock.
// One noun for users: "meeting". Toasts are one sentence, no trailing period.
import {formatCraftDate} from './display-date.mjs';

/** `1 member`, `2 members`; pass the plural form when it is irregular. */
export function plural(count,singular,pluralForm=`${singular}s`){return `${count} ${count===1?singular:pluralForm}`}

/** `2026.10.01 – 10.14`; the end keeps its year only when it differs. */
export function compactRange(start,end){
 if(!start&&!end)return '';
 if(!end||start===end)return formatCraftDate(start);
 const sameYear=start.slice(0,4)===end.slice(0,4);
 return `${formatCraftDate(start)} – ${sameYear?formatCraftDate(end).slice(5):formatCraftDate(end)}`;
}

const allDay=(startTime,endTime)=>startTime==='00:00'&&endTime==='24:00';
/** One line for a meeting's window: dates · hours (or All day) · timezone. */
export function meetingSummary({startDate,endDate,startTime,endTime,timezone}){
 return [compactRange(startDate,endDate),allDay(startTime,endTime)?'All day':`${startTime}–${endTime}`,timezone].filter(Boolean).join(' · ');
}

const weekdayOf=date=>new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short'}).format(new Date(`${date}T00:00:00Z`));
function localParts(instant,timezone){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
 const part=type=>parts.find(item=>item.type===type)?.value||'';
 return {date:`${part('year')}-${part('month')}-${part('day')}`,time:`${part('hour')}:${part('minute')}`};
}
/** `Thu 2026.10.01` */
export function dayLabel(date){return date?`${weekdayOf(date)} ${formatCraftDate(date)}`:''}

const shortFormat=new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'});
/** `Thu, Oct 1` (room-local calendar date). */
export function shortDay(date){return date?shortFormat.format(new Date(`${date}T00:00:00Z`)):''}
/** `Thu, Oct 1 · 10:00–10:30 · Asia/Seoul`: the confirmed card's one time line. */
export function confirmedWhen({date,start,end,timezone}){return [shortDay(date),`${start}–${end}`,timezone].filter(Boolean).join(' · ')}
/** Compact header status for a confirmed meeting: day only; the card on Confirm carries the time. */
export function confirmedChip(confirmation){
 if(!confirmation?.startsAt||!confirmation?.timezone)return '';
 return `Confirmed · ${shortDay(localParts(confirmation.startsAt,confirmation.timezone).date)}`;
}
export const RSVP_LABELS=Object.freeze({accepted:'Accepted',declined:'Declined',tentative:'Maybe',needsAction:'No reply'});
/** `2 accepted · 1 declined · 1 no reply` (empty groups skipped). */
export function rsvpSummary(counts){
 return [['accepted','accepted'],['declined','declined'],['tentative','maybe'],['needsAction','no reply']].filter(([k])=>counts[k]>0).map(([k,word])=>`${counts[k]} ${word}`).join(' · ');
}

/** Compact autosave status shown beside the tabs. */
export function saveStatus({state,dirty,edited}){
 if(state==='error')return {tone:'error',text:'Couldn’t save'};
 if(state==='pending'||state==='saving'||dirty)return {tone:'saving',text:'Saving…'};
 if(!edited)return {tone:'idle',text:''};
 return {tone:'saved',text:'Saved'};
}

export const fillButtonLabel=count=>`Fill ${plural(count,'slot')}`;
export const fillToast=count=>`Filled ${plural(count,'half-hour')}`;
/** Member line on the confirmed card. isRecipient: true / false / null (unknown: the server could not tell). "Organizer" is the placeholder name. */
export function memberInvitedLine(isRecipient,organizer){
 const name=organizer&&organizer!=='Organizer'?organizer:null;
 if(isRecipient===true)return name?`You’re invited · Organized by ${name}`:'You’re invited';
 if(isRecipient===false)return `${name?`Confirmed by ${name}`:'Confirmed by the organizer'} · You weren’t included in the invitation`;
 return name?`Organized by ${name}`:'Confirmed by the organizer';
}
export const invitationsSentToast=count=>`Invitations sent to ${plural(count,'person','people')}`;
export const resendQuestion=count=>typeof count==='number'?`Email ${plural(count,'attendee')} again?`:'Email the attendees again?';

export const MEETING_TOASTS=Object.freeze({
 linkCopied:'Link copied',
 copyFailed:'Couldn’t copy — link selected',
 renamed:'Meeting renamed',
 nameUpdated:'Name updated',
 editSaved:'Changes saved · attendees notified',
 resent:'Invitations re-sent',
 saveFailed:'Couldn’t save your times',
});
