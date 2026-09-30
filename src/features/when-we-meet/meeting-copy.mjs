// User-facing copy and formatters for When We Meet. Pure: no DOM, no clock.
// Strings live in src/i18n/locales/wwm/{en,ko}.json; createMeetingCopy(locale) binds them to one locale.
// The named exports below are the English binding, kept for existing callers and tests.
import {formatCraftDate} from './display-date.mjs';
import {createWwmTranslator,WWM_DEFAULT_LOCALE} from '../../i18n/wwm.mjs';

/** English-only helper kept for callers outside the dictionaries: `1 member`, `2 members`. */
export function plural(count,singular,pluralForm=`${singular}s`){return `${count} ${count===1?singular:pluralForm}`}

/** `2026.10.01 – 10.14`; the end keeps its year only when it differs. Locale-neutral. */
export function compactRange(start,end){
 if(!start&&!end)return '';
 if(!end||start===end)return formatCraftDate(start);
 const sameYear=start.slice(0,4)===end.slice(0,4);
 return `${formatCraftDate(start)} – ${sameYear?formatCraftDate(end).slice(5):formatCraftDate(end)}`;
}

const allDay=(startTime,endTime)=>startTime==='00:00'&&endTime==='24:00';
function localParts(instant,timezone){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(instant));
 const part=type=>parts.find(item=>item.type===type)?.value||'';
 return {date:`${part('year')}-${part('month')}-${part('day')}`,time:`${part('hour')}:${part('minute')}`};
}
const intlLocale=locale=>locale==='ko'?'ko-KR':'en-US';
const utcDate=date=>new Date(`${date}T00:00:00Z`);

/** All user-facing copy for one locale. Same shape as the English named exports. */
export function createMeetingCopy(locale=WWM_DEFAULT_LOCALE){
 const t=createWwmTranslator(locale),lang=intlLocale(locale);
 const list=names=>names.join(t('common.listSeparator'));
 const weekdayFormat=new Intl.DateTimeFormat(lang,{timeZone:'UTC',weekday:'short'});
 const shortFormat=new Intl.DateTimeFormat(lang,{timeZone:'UTC',weekday:'short',month:'short',day:'numeric'});
 const shortDay=date=>date?shortFormat.format(utcDate(date)):'';
 const copy={
  t,locale,
  compactRange,
  /** One line for a meeting's window: dates · hours (or All day) · timezone. */
  meetingSummary:({startDate,endDate,startTime,endTime,timezone})=>[compactRange(startDate,endDate),allDay(startTime,endTime)?t('common.allDay'):`${startTime}–${endTime}`,timezone].filter(Boolean).join(' · '),
  /** `Thu 2026.10.01` / `(목) 2026.10.01` ordering follows English: weekday first. */
  dayLabel:date=>date?`${weekdayFormat.format(utcDate(date))} ${formatCraftDate(date)}`:'',
  /** `Thu, Oct 1` · `10월 1일 (목)` (room-local calendar date). */
  shortDay,
  /** The confirmed card's one time line. */
  confirmedWhen:({date,start,end,timezone})=>[shortDay(date),`${start}–${end}`,timezone].filter(Boolean).join(' · '),
  /** Compact header status for a confirmed meeting: day only. */
  confirmedChip:confirmation=>!confirmation?.startsAt||!confirmation?.timezone?'':t('confirmed.chip',{day:shortDay(localParts(confirmation.startsAt,confirmation.timezone).date)}),
  RSVP_LABELS:Object.freeze({accepted:t('confirmed.rsvp.accepted'),declined:t('confirmed.rsvp.declined'),tentative:t('confirmed.rsvp.tentative'),needsAction:t('confirmed.rsvp.needsAction')}),
  /** `2 accepted · 1 declined · 1 no reply` (empty groups skipped). */
  rsvpSummary:counts=>['accepted','declined','tentative','needsAction'].filter(key=>counts[key]>0).map(key=>t(`confirmed.rsvpCount.${key}`,{count:counts[key]})).join(' · '),
  /** Compact autosave status shown beside the tabs. */
  saveStatus:({state,dirty,edited})=>{
   if(state==='error')return {tone:'error',text:t('save.notSaved')};
   if(state==='pending'||state==='saving'||dirty)return {tone:'saving',text:t('save.saving')};
   if(!edited)return {tone:'idle',text:''};
   return {tone:'saved',text:t('save.saved')};
  },
  fillButtonLabel:count=>t('fill.button',{count}),
  fillToast:(count,removed=0)=>removed>0?t('fill.toastWithRemoved',{count,removed}):t('fill.toast',{count}),
  /** Member line on the confirmed card. isRecipient: true / false / null (unknown). "Organizer" is the placeholder name. */
  memberInvitedLine:(isRecipient,organizer)=>{
   const name=organizer&&organizer!=='Organizer'?organizer:null;
   if(isRecipient===true)return name?t('confirmed.youreInvitedBy',{name}):t('confirmed.youreInvited');
   if(isRecipient===false)return name?t('confirmed.notIncluded',{name}):t('confirmed.notIncludedAnon');
   return name?t('confirmed.organizedBy',{name}):t('confirmed.confirmedByOrganizer');
  },
  invitationsSentToast:count=>t('confirm.invitationsSent',{count}),
  resendQuestion:count=>typeof count==='number'?t('resend.question',{count}):t('resend.questionUnknown'),
  MEETING_TOASTS:Object.freeze({
   linkCopied:t('toast.linkCopied'),copyFailed:t('toast.copyFailed'),renamed:t('toast.renamed'),nameUpdated:t('toast.nameUpdated'),
   editSaved:t('edit.savedToast'),resent:t('resend.toast'),saveFailed:t('toast.saveFailed'),scheduleSaved:t('toast.scheduleSaved'),deleted:t('toast.deleted'),
  }),
  /** Best-times row: `4/5 available · missing: Taylor`, or `Everyone available`. */
  bestTimeLine:({count,total,missing})=>count===total?t('confirm.everyoneAvailable'):t('confirm.partlyAvailableLine',{count,total,names:list(missing)}),
  /** One date+time format for Review, Edit and the confirmed card. */
  dayTime:({date,start,end})=>[shortDay(date),start&&end?`${start}–${end}`:''].filter(Boolean).join(' · '),
  /** Settings warning before saving a narrower schedule. */
  scheduleWarning:({removedSlots,people},confirmed)=>[removedSlots>0?t('settings.scheduleWarningLost',{count:removedSlots,names:list(people)}):'',confirmed?t('settings.scheduleConfirmedStays'):''].filter(Boolean).join(' '),
  deleteMeetingCopy:(title,confirmed)=>({title:t('settings.deleteTitle',{title}),description:`${t('settings.deleteBody')}${confirmed?` ${t('settings.deleteCalendarNote')}`:''}`}),
  loadErrorTitle:title=>title?t('room.loadErrorTitle',{title}):t('room.loadErrorThisMeeting'),
  organizedBy:name=>name?t('confirmed.organizedBy',{name}):'',
  /** A failed request as dictionary copy, chosen by HTTP status and what the user was doing. The server's English `error` is never shown. */
  apiError:(error,situation)=>{
   const status=error&&typeof error.status==='number'?error.status:undefined;
   if(status===401)return t('errors.session');
   if(situation==='create')return t(status===400?'errors.createInvalid':'errors.create');
   if(situation==='join')return status===400||status===403||status===404?t('invitation.invalid'):t('errors.join');
   if(status===403)return t('errors.notOwner');
   if(status===409)return t('errors.conflict');
   if(situation==='schedule'&&status===400)return t('errors.invalidSchedule');
   return t({rename:'settings.renameFailed',schedule:'settings.scheduleFailed',delete:'settings.deleteFailed'}[situation]||'errors.generic');
  },
  MEETING_COPY:Object.freeze({
   titleLabel:t('create.titleLabel'),titlePlaceholder:t('create.titlePlaceholder'),titleError:t('create.titleError'),
   peopleHeading:t('people.heading'),organizerBadge:t('common.organizer'),reviewDescription:t('confirm.reviewDescription'),
   send:t('confirm.send'),sendRetry:t('confirm.sendRetry'),noLongerWorks:t('confirm.warnings.noLongerWorks'),bestTimes:t('confirm.bestTimes'),
   scheduleHeading:t('settings.scheduleHeading'),deleteMeeting:t('settings.deleteMeeting'),deleteHint:t('settings.deleteHint'),
   deleteConfirm:t('settings.deleteConfirm'),deleting:t('settings.deleting'),invitationHeading:t('invitation.heading'),
   loadErrorDetail:t('room.loadErrorDetail'),reconnect:t('fill.connect'),reconnectPrompt:t('fill.connectPrompt'),
  }),
 };
 return Object.freeze(copy);
}

const english=createMeetingCopy('en');
export const {meetingSummary,dayLabel,shortDay,confirmedWhen,confirmedChip,RSVP_LABELS,rsvpSummary,saveStatus,fillButtonLabel,fillToast,memberInvitedLine,invitationsSentToast,resendQuestion,MEETING_TOASTS,bestTimeLine,dayTime,scheduleWarning,deleteMeetingCopy,loadErrorTitle,organizedBy,MEETING_COPY}=english;
