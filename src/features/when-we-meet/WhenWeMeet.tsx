'use client';
import WallBackLink from '@/container/light-wall/WallBackLink';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { makeSlots } from './domain.mjs';
import {creationErrors,revalidateCreationErrors,todayInTimezone,type CreationErrors,type CreationField} from './creation-validation.mjs';
import './creation-control.css';
import { connectGoogleCalendar, createRoom, deleteRoom, joinRoom, loadConfirmation, loadInvitationPreview, loadRoom, renameRoom, resendConfirmation, signInWithGoogle, updateRoomSchedule, type InvitationPreview, type Response, type Room, type RoomSchedule } from './api';
import {calendarReturnNotice} from './calendar-fill.mjs';
import {useRouter} from 'next/navigation';
import { DateRangePicker } from './DateRangePicker';
import { TimezoneCombobox } from './TimezoneCombobox';
import {useCraftAccount} from '@/app/craft/CraftAccount';
import {saveDraft,readDraft,clearDraft,markCreateReturn,consumeCreateReturn} from './draft.mjs';
import {WeeklyAvailability} from './WeeklyAvailability';
import {GuestCalendarPreview} from './GuestCalendarPreview';
import {LoadingState} from './LoadingState';
import './when-we-meet.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {Button} from '@/components/ui/button';
import {GoogleSignInButton} from '@/components/craft/GoogleSignInButton';
import {Input} from '@/components/ui/input';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {RollingNumber} from '@/components/craft/RollingNumber.mjs';
import {useAvailabilitySync} from './useAvailabilitySync';
import './room-toolbar.css';
import {TimeRangeFields} from './TimeRangeFields';
import {toast} from 'sonner';
import {InvitationLanding} from './InvitationLanding';
import {invitationPath,markInviteReturn,consumeInviteReturn,clearInviteReturn,profileName} from './invitation.mjs';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {AlertDialog,AlertDialogAction,AlertDialogCancel,AlertDialogContent,AlertDialogDescription,AlertDialogFooter,AlertDialogHeader,AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Notice} from './Notice';
import {Separator} from '@/components/ui/separator';

import {deviceTimezone} from './timezone-options.mjs';
import {Suspense} from 'react';
import {RoomResponseLoader,type RoomResponseResult} from './RoomResponseLoader';
import {AlertCircle} from 'lucide-react';
import {AvailabilitySkeleton} from './ServerSkeletons';
import {PeoplePanel} from './PeoplePanel';
import {CalendarFill} from './CalendarFill';
import {ConfirmTab,confirmReturnKey} from './ConfirmTab';
import {CreatedMeetingDialog,InviteLinkDialog,RoomHeader,copyLink,type CreatedMeeting} from './RoomChrome';
import {RICH_SLOT,rich,useWwmCopy} from './i18n/WwmI18nProvider';
import {scheduleChanged,scheduleErrors,scheduleImpact,type ScheduleErrors} from './room-schedule.mjs';
import {clearFillHighlight} from './fill-highlight.mjs';
import type {ConfirmationRecordData} from './confirm-tab.mjs';
const initial={title:'',startDate:'',endDate:'',startTime:'00:00',endTime:'24:00',timezone:'UTC'};
type Slot={id:string;utc:string;date:string;time:string};
/** Underline that slides horizontally to the active tab; transitions only after the first placement. */
function TabIndicator({value}:{value:string}){
  const ref=useRef<HTMLSpanElement>(null);
  useLayoutEffect(()=>{
    const bar=ref.current,list=bar?.parentElement;
    if(!bar||!list){return;}
    const place=()=>{
      const active=list.querySelector<HTMLElement>('[role="tab"][data-state="active"]');
      if(!active){return;}
      bar.style.width=`${active.offsetWidth}px`;bar.style.transform=`translateX(${active.offsetLeft}px)`;bar.dataset.ready='true';
    };
    place();
    const frame=requestAnimationFrame(()=>{bar.dataset.animate='true'});
    const observer=new ResizeObserver(place);observer.observe(list);
    return()=>{cancelAnimationFrame(frame);observer.disconnect()};
  },[value]);
  return <span ref={ref} className="wwm-tab-indicator" aria-hidden="true"/>;
}
export default function WhenWeMeet({roomId,initialRoom,meetingsSection,responsesPromise,initialConfirmation=null}:{initialConfirmation?:ConfirmationRecordData|null;responsesPromise?:Promise<RoomResponseResult>;roomId?:string;initialRoom?:{room:Room;responses:Response[];userId:string}|null;meetingsSection?:React.ReactNode}) {
  const router=useRouter();
  const copy=useWwmCopy(),{t,deleteMeetingCopy,loadErrorTitle,meetingSummary,saveStatus,scheduleWarning,MEETING_TOASTS}=copy;
  const [form,setForm]=useState(initial),[name,setName]=useState(initialRoom?.responses.find(x=>x.userId===initialRoom.userId)?.displayName||''),[room,setRoom]=useState<Room|null>(initialRoom?.room||null);
  const [responses,setResponses]=useState<Response[]>(initialRoom?.responses||[]),[mine,setMine]=useState<string[]>(initialRoom?.responses.find(x=>x.userId===initialRoom.userId)?.slots||[]);
  const [status,setStatus]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[token,setToken]=useState(''),[loginPrompt,setLoginPrompt]=useState(false);
  const [inviteReady,setInviteReady]=useState(false),[nameReady,setNameReady]=useState(false);
  const joinPending=useRef(false),joinAttempted=useRef('');
  const {user:profile,loading:accountLoading}=useCraftAccount();
  const [showCreate,setShowCreate]=useState(false);
  const [createError,setCreateError]=useState('');
  const [fieldErrors,setFieldErrors]=useState<CreationErrors>({});
  const [today,setToday]=useState(()=>todayInTimezone(initial.timezone)||'');
  useEffect(()=>{if(!showCreate){return;}const refresh=()=>{const clock=new Date();setToday(todayInTimezone(form.timezone,clock)||'');setFieldErrors(old=>{const next=revalidateCreationErrors(old,{...form,name},clock,t);return JSON.stringify(old)===JSON.stringify(next)?old:next})};refresh();const timer=window.setInterval(refresh,30000);return()=>window.clearInterval(timer)},[showCreate,form,name,t]);
  function updateForm(field:keyof typeof initial,value:string,_clear?:CreationField){setForm(old=>({...old,[field]:value}))}
  function clearField(_field:CreationField){/* Revalidation runs against the complete draft after state updates. */}
  const createPending=useRef(false);
  const createTrigger=useRef<HTMLButtonElement>(null);
  // Keep Radix's generated title id (the dialog's aria-labelledby); focus the heading through a ref instead.
  const createTitle=useRef<HTMLHeadingElement>(null);
  const promptAfterClose=useRef(false);
  const defaultTimezone=useRef(initial.timezone);
  const draftDirty=Boolean(form.title||form.startDate||form.endDate||name||form.startTime!==initial.startTime||form.endTime!==initial.endTime||form.timezone!==defaultTimezone.current);
  const ownerId=profile?.id;
  useEffect(()=>{if(!roomId){const draft=readDraft(window.sessionStorage);const returning=consumeCreateReturn(window.sessionStorage,window.location.pathname);defaultTimezone.current=deviceTimezone();if(draft){setForm({...initial,...draft.form});setName(draft.name);if(returning){setShowCreate(true)}}else{setForm({...initial,timezone:defaultTimezone.current})}}},[roomId]);
  useEffect(()=>{if(roomId||!draftDirty){return;}saveDraft(window.sessionStorage,{form,name})},[roomId,form,name,draftDirty]);
  useEffect(()=>{if(roomId){return;}const preserve=()=>{if(draftDirty){saveDraft(window.sessionStorage,{form,name})}};window.addEventListener('craft-before-login',preserve);return()=>window.removeEventListener('craft-before-login',preserve)},[roomId,form,name,draftDirty]);
  async function login(){setError('');if(!roomId&&(form.title||form.startDate||form.endDate||name||form.startTime!==initial.startTime||form.endTime!==initial.endTime||form.timezone!==defaultTimezone.current)){saveDraft(window.sessionStorage,{form,name});}if(loginPrompt){markCreateReturn(window.sessionStorage,window.location.pathname)}try{await signInWithGoogle(window.location.pathname+window.location.search);}catch{consumeCreateReturn(window.sessionStorage,window.location.pathname);setError(t('auth.unavailable'));setLoginPrompt(false);setShowCreate(true);}}
  useEffect(()=>{if(roomId){setToken(new URLSearchParams(window.location.search).get('invite')||'');setInviteReady(true);}},[roomId]);
  // Invitation context before sign-in: token-gated server read of title, dates, timezone and organizer only.
  const [preview,setPreview]=useState<InvitationPreview|null|'unavailable'|undefined>(undefined);
  useEffect(()=>{if(!roomId||room||!inviteReady||!invitationPath(roomId,token))return;const controller=new AbortController();loadInvitationPreview(roomId,token,controller.signal).then(value=>{if(!controller.signal.aborted)setPreview(value)},()=>{if(!controller.signal.aborted)setPreview('unavailable')});return()=>controller.abort()},[roomId,room,inviteReady,token]);
  useEffect(()=>{if(roomId&&!room&&!accountLoading&&profile){const fallback=profileName(profile.user_metadata);if(fallback){setName(previous=>previous||fallback);setNameReady(true)}}},[roomId,room,accountLoading,profile]);
  const slots=useMemo(()=>room?makeSlots(room) as Slot[]:[],[room]);
  const [responsesReady,setResponsesReady]=useState(!responsesPromise),[responsesError,setResponsesError]=useState('');
  const applyResponses=useCallback((result:RoomResponseResult)=>{if(result.error){setResponsesError(result.error);return;}const rows=result.responses||[];const self=rows.find(row=>row.userId===initialRoom?.userId);setResponses(rows);setName(self?.displayName||'');setMine(self?.slots||[]);setSavedName(self?.displayName||'');setSavedMine(self?.slots||[]);setResponsesError('');setResponsesReady(true)},[initialRoom?.userId]);
  async function retryResponses(){if(!roomId)return;setResponsesError('');try{const result=await loadRoom(roomId);applyResponses({responses:result.responses})}catch{setResponsesError(t('room.loadErrorDetail'))}}
  const [created,setCreated]=useState<CreatedMeeting|null>(null);
  const openingCreated=useRef(false);
  // The header's confirmed status; the Confirm tab reports changes back. A confirmed meeting opens on Confirm.
  const [confirmation,setConfirmation]=useState<ConfirmationRecordData|null>(initialConfirmation);
  const [view,setView]=useState<'availability'|'everyone'|'people'|'confirm'>(initialConfirmation?.status==='confirmed'?'confirm':'availability');
  const [joined,setJoined]=useState(false),[inviteFallback,setInviteFallback]=useState('');
  const menuTrigger=useRef<HTMLButtonElement>(null);
  const [savedMine,setSavedMine]=useState<string[]>(initialRoom?.responses.find(x=>x.userId===initialRoom.userId)?.slots||[]),[savedName,setSavedName]=useState(initialRoom?.responses.find(x=>x.userId===initialRoom.userId)?.displayName||'');
  const dirty=Boolean(room)&&(name!==savedName||mine.length!==savedMine.length||mine.some(id=>!savedMine.includes(id)));
  const tabNames={availability:t('room.tabs.availability'),everyone:t('room.tabs.everyone'),people:t('room.tabs.people'),confirm:t('room.tabs.confirm')} as const;
  // After a Calendar consent round trip started from Confirm, reopen that tab once (never re-sends anything).
  useEffect(()=>{if(!roomId)return;try{const key=confirmReturnKey(roomId);if(window.sessionStorage.getItem(key)==='confirm'){window.sessionStorage.removeItem(key);setView('confirm')}}catch{/* tab storage unavailable */}},[roomId]);
  // Calendar consent returns with ?calendar=<outcome>: announce once, drop the flag, fetch/apply nothing.
  useEffect(()=>{if(!roomId)return;const url=new URL(window.location.href);const notice=calendarReturnNotice(url.searchParams.get('calendar'),t);if(!url.searchParams.has('calendar'))return;url.searchParams.delete('calendar');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);if(notice)(notice.tone==='success'?toast.success:notice.tone==='error'?toast.error:toast.info)(notice.text)},[roomId,t]);
  function selectTab(next:typeof view){setView(next)}

  async function create(e:React.FormEvent){e.preventDefault();if(busy||accountLoading||createPending.current){return;}setCreateError('');const errors=creationErrors({...form,name},new Date(),t);setToday(todayInTimezone(form.timezone)||'');setFieldErrors(errors);const first=(['title','dates','timezone','name'] as CreationField[]).find(key=>errors[key]);if(first){requestAnimationFrame(()=>document.getElementById({title:'wwm-create-title-input',dates:'wwm-range-trigger',timezone:'wwm-create-timezone',name:'wwm-create-name'}[first])?.focus());return}if(!profile){saveDraft(window.sessionStorage,{form,name});promptAfterClose.current=true;setShowCreate(false);return}createPending.current=true;setBusy(true);setStatus(t('create.submittingStatus'));try{const result=await createRoom({title:form.title,startDate:form.startDate,endDate:form.endDate,startTime:form.startTime,endTime:form.endTime,timezone:form.timezone},name.trim());clearDraft(window.sessionStorage);if(ownerId){router.refresh()}openingCreated.current=false;setCreated({id:result.id,title:form.title.trim(),link:`${window.location.origin}/craft/when-we-meet/${result.id}?invite=${result.inviteToken}`,summary:meetingSummary(form)});setStatus('');setShowCreate(false);setForm(initial);setName('');setFieldErrors({});}catch(e){setCreateError(copy.apiError(e,'create'));setStatus('');}finally{createPending.current=false;setBusy(false)}}
  const join=useCallback(async()=>{if(joinPending.current||!roomId||!invitationPath(roomId,token)||!name.trim()){return;}joinPending.current=true;setBusy(true);setError('');setStatus(t('invitation.joiningStatus'));try{await joinRoom(roomId,token,name.trim());const result=await loadRoom(roomId);setRoom(result.room);setResponses(result.responses);const self=result.responses.find(x=>x.userId===result.userId);setMine(self?.slots||[]);setSavedMine(self?.slots||[]);setSavedName(self?.displayName||name.trim());setStatus('');clearInviteReturn(window.sessionStorage);setView('availability');setJoined(true);toast.success(rich(t('room.joined',{title:RICH_SLOT}),RICH_SLOT,<strong>{result.room.title}</strong>));router.refresh();}catch(e){setError(copy.apiError(e,'join'));setStatus('');}finally{joinPending.current=false;setBusy(false)}},[roomId,token,name,router,t,copy]);
  useEffect(()=>{if(!roomId||room||!inviteReady||accountLoading||!profile||!nameReady||!name.trim()||error){return;}const path=invitationPath(roomId,token);if(!path||joinAttempted.current===path){return;}joinAttempted.current=path;consumeInviteReturn(window.sessionStorage,path);void join();},[roomId,room,inviteReady,accountLoading,profile,nameReady,name,token,error,join]);
  const [settingsOpen,setSettingsOpen]=useState(false),[settingsName,setSettingsName]=useState('');
  // Owner-only meeting rename; members never see the field (the server re-checks ownership).
  const [settingsTitle,setSettingsTitle]=useState(''),[renameError,setRenameError]=useState(''),[renaming,setRenaming]=useState(false);
  const isOwner=Boolean(room&&(room.role==='ADMIN'||room.ownerId&&room.ownerId===(initialRoom?.userId||profile?.id)));
  const titleInvalid=isOwner&&(!settingsTitle.trim()||settingsTitle.trim().length>100);
  // Owner schedule edit. Rule: saved availability outside the new window is removed; a confirmed meeting stays as sent.
  const [schedule,setSchedule]=useState<RoomSchedule|null>(null),[scheduleErrs,setScheduleErrs]=useState<ScheduleErrors>({}),[scheduleError,setScheduleError]=useState('');
  const scheduleDirty=Boolean(isOwner&&room&&schedule&&scheduleChanged(room,schedule));
  const impact=useMemo(()=>scheduleDirty&&schedule&&!Object.keys(scheduleErrors(schedule,{previousStart:room?.startDate})).length?scheduleImpact(responses,schedule):{removedSlots:0,people:[]},[scheduleDirty,schedule,responses,room?.startDate]);
  const confirmedMeeting=confirmation?.status==='confirmed';
  const warning=scheduleDirty?scheduleWarning(impact,confirmedMeeting):'';
  const [deleteOpen,setDeleteOpen]=useState(false),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState('');
  async function saveSettings(){
    if(!room||renaming||!settingsName.trim()||titleInvalid){return;}
    const title=settingsTitle.trim(),renamed=isOwner&&title!==room.title,nameChanged=settingsName.trim()!==name;
    if(scheduleDirty&&schedule){const errors=scheduleErrors(schedule,{previousStart:room.startDate},new Date(),t);setScheduleErrs(errors);if(Object.keys(errors).length)return;}
    if(renamed){
      setRenaming(true);setRenameError('');
      try{const result=await renameRoom(room.id,title);setRoom(current=>current&&{...current,title:result.title});router.refresh();}
      catch(e){setRenameError(copy.apiError(e,'rename'));setRenaming(false);return;}
      setRenaming(false);
    }
    if(scheduleDirty&&schedule){
      setRenaming(true);setScheduleError('');
      try{
       const result=await updateRoomSchedule(room.id,schedule);
       setRoom(current=>current&&{...current,...result.schedule});
       // The server trimmed saved availability; reload it instead of guessing.
       try{const fresh=await loadRoom(room.id);applyResponses({responses:fresh.responses})}catch{/* the live stream catches up */}
       router.refresh();
      }catch(e){setScheduleError(copy.apiError(e,'schedule'));setRenaming(false);return;}
      setRenaming(false);
    }
    sync.rename(settingsName.trim());setSettingsOpen(false);
    if(renamed||nameChanged||scheduleDirty)toast.success(scheduleDirty?MEETING_TOASTS.scheduleSaved:renamed?MEETING_TOASTS.renamed:MEETING_TOASTS.nameUpdated);
  }
  async function removeMeeting(){
    if(!room||deleting)return;
    setDeleting(true);setDeleteError('');
    try{await deleteRoom(room.id);toast.success(MEETING_TOASTS.deleted);router.push('/craft/when-we-meet');router.refresh();}
    catch(e){setDeleteError(copy.apiError(e,'delete'));setDeleting(false);}
  }
  const sync=useAvailabilitySync({roomId,userId:initialRoom?.userId||profile?.id,enabled:Boolean(room)&&Boolean(profile)&&responsesReady,initial:{name:savedName,slots:savedMine},draft:{name,slots:mine},onSaved:value=>{setSavedName(value.name);setSavedMine(value.slots)},onDraft:value=>{setName(value.name);setMine(value.slots)},onResponses:setResponses});
  async function invite(){const code=room?.inviteToken||token;if(!room||!code){toast.error(t('invitation.linkUnavailable'));return}const link=`${window.location.origin}/craft/when-we-meet/${room.id}?invite=${code}`;if(!(await copyLink(link,MEETING_TOASTS.linkCopied))){setInviteFallback(link);toast.error(MEETING_TOASTS.copyFailed)}}
  // Compact autosave status beside the tabs. The state appears after the first edit in this visit.
  const [edited,setEdited]=useState(false);
  useEffect(()=>{if(dirty||sync.state!=='saved')setEdited(true)},[dirty,sync.state]);
  const retrySave=useRef(sync.retry);
  useEffect(()=>{retrySave.current=sync.retry});
  useEffect(()=>{if(sync.state==='error')toast.error(MEETING_TOASTS.saveFailed,{id:'wwm-save-error',action:{label:t('common.retry'),onClick:()=>retrySave.current()}})},[sync.state,MEETING_TOASTS.saveFailed,t]);
  const save=saveStatus({state:sync.state,dirty,edited});
  /** Fresh-row highlight in the meetings list when the creator stays on the list. */
  function highlightRow(id:string){let tries=0;const find=()=>{const row=document.querySelector<HTMLElement>(`[data-meeting-id="${CSS.escape(id)}"]`);if(row){row.dataset.fresh='true';window.setTimeout(()=>{delete row.dataset.fresh},2400);return}if(++tries<30)window.setTimeout(find,100)};find()}
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const userId=initialRoom?.userId||profile?.id;
  const resend=isOwner&&room?{recipientCount:async()=>{const data=await loadConfirmation(room.id);return data.review?.edit?.recipientIds.length},send:()=>resendConfirmation(room.id)}:undefined;
  // Slots the last Fill/Undo changed (also in fill-highlight.mjs for the grid); cleared when leaving the tab.
  const [fillHighlight,setFillHighlight]=useState<string[]>([]);
  useEffect(()=>{if(view!=='availability'){setFillHighlight([]);clearFillHighlight()}},[view]);
  const fill=room&&view==='availability'?<CalendarFill roomId={room.id} slots={slots} selected={mine} onApply={sync.replace} onApplied={setFillHighlight} onReconnect={()=>void connectGoogleCalendar(room.id,window.location.pathname+window.location.search).catch(()=>toast.error(t('confirm.calendarUnavailable')))}/>:null;
  return <main className={`wwm ${room?'wwm-room':!roomId?'wwm-index':''}`}><div className="wwm-topline"><WallBackLink href={roomId?'/craft/when-we-meet':'/craft'}>{roomId?t('app.meetings'):t('app.craft')}</WallBackLink></div><div className="wwm-shell">
  {room?<RoomHeader title={room.title} startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} confirmation={confirmation} offline={sync.offline} settingsDisabled={!responsesReady} menuTrigger={menuTrigger} onInvite={()=>void invite()} onSettings={()=>{setSettingsName(name);setSettingsTitle(room.title);setRenameError('');setSchedule({startDate:room.startDate,endDate:room.endDate,startTime:room.startTime,endTime:room.endTime,timezone:room.timezone});setScheduleErrs({});setScheduleError('');setSettingsOpen(true)}} resend={resend}/>
  :<header><div className="wwm-hero-row"><h1>{t('app.name')}</h1>{!roomId&&profile&&<Button className="wwm-new-meeting" ref={createTrigger} type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NEW} onClick={()=>{setToday(todayInTimezone(form.timezone)||'');setShowCreate(true)}}>{t('list.newMeeting')}</Button>}</div><p>{t('app.tagline')}</p></header>}
  {!configured&&<section className="wwm-alert" role="alert"><strong>{t('room.connectionRequired')}</strong><p>{t('room.notConfigured')}</p></section>}
  {!roomId&&<Dialog open={loginPrompt} onOpenChange={open=>{setLoginPrompt(open);if(!open){setShowCreate(true)}}}><DialogContent className="wwm-login-dialog" closeLabel={t('common.close')} onCloseAutoFocus={e=>{if(showCreate){e.preventDefault()}}}><DialogHeader><DialogTitle>{t('guest.signInToCreate')}</DialogTitle><DialogDescription>{t('guest.draftKept')}</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} onClick={()=>{setLoginPrompt(false);setShowCreate(true)}}>{t('common.cancel')}</Button><GoogleSignInButton data-analytics-label={ANALYTICS_ELEMENTS.SIGN_IN} label={t('common.continueWithGoogle')} pendingLabel={t('common.connectingToGoogle')} onClick={()=>void login()}/></DialogFooter></DialogContent></Dialog>}
  {error&&!(roomId&&!room&&configured)&&<p className="wwm-alert" role="alert">{error}</p>}{status&&<p role="status" aria-live="polite">{status}</p>}
  {!roomId&&configured&&accountLoading&&<LoadingState label={t('list.checkingAccount')} description={t('list.gettingReady')}/>}
  {!roomId&&meetingsSection}
  {!roomId&&configured&&!accountLoading&&!profile&&<><section className="wwm-guest-stage" aria-label={t('guest.signInRegion')} data-analytics-section={ANALYTICS_SECTIONS.WWM_MEETINGS}><GuestCalendarPreview/><div className="wwm-guest-panel"><h2>{t('guest.headline')}</h2><p>{t('guest.body')}</p><GoogleSignInButton data-analytics-label={ANALYTICS_ELEMENTS.SIGN_IN} label={t('common.continueWithGoogle')} pendingLabel={t('common.connectingToGoogle')} onClick={()=>void login()}/><Button ref={createTrigger} type="button" variant="outline" className="wwm-guest-create" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NEW} onClick={()=>{setToday(todayInTimezone(form.timezone)||'');setShowCreate(true)}}>{t('guest.createMeeting')}</Button></div></section></>}
  {!roomId&&<Dialog open={showCreate} onOpenChange={open=>{if(!busy){setShowCreate(open);if(!open&&draftDirty){saveDraft(window.sessionStorage,{form,name})}}}}><DialogContent className="wwm-create-dialog" closeLabel={t('common.close')} showCloseButton={!busy} onCloseAutoFocus={e=>{if(promptAfterClose.current){e.preventDefault();promptAfterClose.current=false;setLoginPrompt(true)}else{e.preventDefault();createTrigger.current?.focus()}}} onEscapeKeyDown={e=>{if(busy||document.querySelector('.wwm-range>.wwm-picker-trigger[aria-expanded="true"]')){e.preventDefault()}}} onPointerDownOutside={e=>{if(busy||e.target instanceof Element&&e.target.closest('.wwm-picker-panel,.wwm-range-panel')){e.preventDefault()}}} onOpenAutoFocus={e=>{e.preventDefault();requestAnimationFrame(()=>createTitle.current?.focus())}}><DialogHeader><DialogTitle ref={createTitle} tabIndex={-1}>{t('create.dialogTitle')}</DialogTitle><DialogDescription className="wwm-sr-only">{t('create.dialogDescription')}</DialogDescription></DialogHeader><form id="wwm-create-form" noValidate data-analytics-label={ANALYTICS_ELEMENTS.MEETING_CREATE_FORM} data-analytics-section={ANALYTICS_SECTIONS.WWM_CREATE} onSubmit={create}><div className="wwm-create-body"><div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-create-title-input">{t('create.titleLabel')}</RequiredFieldLabel><Input id="wwm-create-title-input" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_TITLE_INPUT} required maxLength={100} value={form.title} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title?'wwm-create-title-error':undefined} onChange={e=>updateForm('title',e.target.value)} placeholder={t('create.titlePlaceholder')} />{fieldErrors.title&&<p id="wwm-create-title-error" className="wwm-field-error" role="alert">{fieldErrors.title}</p>}</div><div className="wwm-fields"><DateRangePicker start={form.startDate} end={form.endDate} minDate={today} error={fieldErrors.dates} onChange={(startDate,endDate)=>{setForm(old=>({...old,startDate,endDate}));clearField('dates')}}/>{fieldErrors.dates&&<p id="wwm-create-dates-error" className="wwm-field-error" role="alert">{fieldErrors.dates}</p>}</div><TimeRangeFields start={form.startTime} end={form.endTime} onChange={(startTime,endTime)=>setForm(old=>({...old,startTime,endTime}))}/><div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-create-timezone">{t('common.timezone')}</RequiredFieldLabel><TimezoneCombobox id="wwm-create-timezone" required value={form.timezone} onChange={timezone=>{updateForm('timezone',timezone,'timezone');clearField('dates');setToday(todayInTimezone(timezone)||'')}} error={fieldErrors.timezone} aria-describedby={fieldErrors.timezone?'wwm-create-timezone-error':undefined} referenceDate={form.startDate}/>{fieldErrors.timezone&&<p id="wwm-create-timezone-error" className="wwm-field-error" role="alert">{fieldErrors.timezone}</p>}</div><div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-create-name">{t('common.yourName')}</RequiredFieldLabel><Input id="wwm-create-name" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NAME_INPUT} required maxLength={50} value={name} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name?'wwm-create-name-error':undefined} onChange={e=>{setName(e.target.value);clearField('name')}} placeholder={t('common.yourName')}/>{fieldErrors.name&&<p id="wwm-create-name-error" className="wwm-field-error" role="alert">{fieldErrors.name}</p>}</div></div><div id="wwm-create-status" tabIndex={-1} className="wwm-create-status" role={createError?'alert':'status'} aria-live="polite">{createError||status===t('create.submittingStatus')&&status||''}</div><DialogFooter className="wwm-create-footer"><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={busy} onClick={()=>setShowCreate(false)}>{t('common.cancel')}</Button><Button data-analytics-label={ANALYTICS_ELEMENTS.MEETING_CREATE_SUBMIT} disabled={!configured||busy||accountLoading}>{busy?t('create.submitting'):t('create.submit')}</Button></DialogFooter></form></DialogContent></Dialog>}
  {!roomId&&<CreatedMeetingDialog meeting={created} onOpenMeeting={id=>{openingCreated.current=true;setCreated(null);router.push(`/craft/when-we-meet/${id}`)}} onClose={()=>setCreated(null)} onCloseAutoFocus={event=>{event.preventDefault();if(openingCreated.current)return;createTrigger.current?.focus();const id=created?.id;if(id)highlightRow(id)}}/>}
  {roomId&&!room&&configured&&<InvitationLanding signedIn={Boolean(profile)} loading={accountLoading||!inviteReady} busy={busy} valid={Boolean(invitationPath(roomId,token))} name={name} nameReady={nameReady} onName={setName} error={error} onSignIn={()=>{const path=invitationPath(roomId,token);if(!path){return;}if(!markInviteReturn(window.sessionStorage,path)){setError(t('invitation.storageUnavailable'));return;}void signInWithGoogle(path.split('?')[0]).catch(()=>{clearInviteReturn(window.sessionStorage);setError(t('auth.unavailable'))})}} preview={preview} onJoin={()=>void join()} onRetry={()=>{joinAttempted.current='';setError('');void join()}}/>}
  {room&&<>
  <InviteLinkDialog link={inviteFallback} onClose={()=>setInviteFallback('')} onCloseAutoFocus={event=>{event.preventDefault();menuTrigger.current?.focus()}}/>
  <Dialog open={settingsOpen} onOpenChange={open=>{if(!renaming)setSettingsOpen(open)}}><DialogContent className="wwm-settings-dialog" closeLabel={t('common.close')} onCloseAutoFocus={event=>{event.preventDefault();if(!deleteOpen)menuTrigger.current?.focus()}} showCloseButton={!renaming} onEscapeKeyDown={e=>{if(renaming||document.querySelector('.wwm-settings-dialog [aria-expanded="true"]'))e.preventDefault()}} onPointerDownOutside={e=>{if(renaming||e.target instanceof Element&&e.target.closest('.wwm-picker-panel,.wwm-range-panel,[data-slot="popover-content"]'))e.preventDefault()}}><DialogHeader className="wwm-sr-only"><DialogTitle>{t('settings.title')}</DialogTitle><DialogDescription>{isOwner?t('settings.description'):t('settings.memberDescription')}</DialogDescription></DialogHeader><form data-analytics-label={ANALYTICS_ELEMENTS.MEETING_SETTINGS_FORM} noValidate onSubmit={event=>{event.preventDefault();void saveSettings()}}>{isOwner&&<div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-settings-title">{t('settings.meetingName')}</RequiredFieldLabel><Input id="wwm-settings-title" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_RENAME_INPUT} required maxLength={100} value={settingsTitle} disabled={renaming} aria-invalid={titleInvalid||Boolean(renameError)} aria-describedby={renameError?'wwm-settings-title-error':undefined} onChange={event=>{setSettingsTitle(event.target.value);setRenameError('')}}/>{renameError&&<p id="wwm-settings-title-error" className="wwm-field-error" role="alert">{renameError}</p>}</div>}
  {isOwner&&schedule&&<fieldset className="wwm-settings-schedule" disabled={renaming}><legend>{t('settings.scheduleHeading')}</legend>
   <DateRangePicker id="wwm-settings-range" errorId="wwm-settings-dates-error" start={schedule.startDate} end={schedule.endDate} minDate={[todayInTimezone(schedule.timezone)||'',room.startDate].filter(Boolean).sort()[0]} error={scheduleErrs.dates} onChange={(startDate,endDate)=>{setSchedule(old=>old&&{...old,startDate,endDate});setScheduleErrs(old=>({...old,dates:undefined}))}}/>{scheduleErrs.dates&&<p id="wwm-settings-dates-error" className="wwm-field-error" role="alert">{scheduleErrs.dates}</p>}
   <TimeRangeFields start={schedule.startTime} end={schedule.endTime} onChange={(startTime,endTime)=>{setSchedule(old=>old&&{...old,startTime,endTime});setScheduleErrs(old=>({...old,times:undefined}))}}/>{scheduleErrs.times&&<p className="wwm-field-error" role="alert">{scheduleErrs.times}</p>}
   <div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-settings-timezone">{t('common.timezone')}</RequiredFieldLabel><TimezoneCombobox id="wwm-settings-timezone" required value={schedule.timezone} onChange={timezone=>{setSchedule(old=>old&&{...old,timezone});setScheduleErrs(old=>({...old,timezone:undefined}))}} error={scheduleErrs.timezone} aria-describedby={scheduleErrs.timezone?'wwm-settings-timezone-error':undefined} referenceDate={schedule.startDate}/>{scheduleErrs.timezone&&<p id="wwm-settings-timezone-error" className="wwm-field-error" role="alert">{scheduleErrs.timezone}</p>}</div>
   {warning&&<Notice tone="warning" className="wwm-settings-warning">{warning}</Notice>}
   {scheduleError&&<Notice tone="error">{scheduleError}</Notice>}
  </fieldset>}<div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-settings-name">{t('common.yourName')}</RequiredFieldLabel><Input id="wwm-settings-name" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NAME_INPUT} required maxLength={50} value={settingsName} disabled={renaming} onChange={event=>setSettingsName(event.target.value)}/></div>{isOwner&&<section className="wwm-settings-danger" aria-labelledby="wwm-settings-danger-title"><Separator/><div><h3 id="wwm-settings-danger-title" className="wwm-sr-only">{t('settings.deleteMeeting')}</h3><p>{t('settings.deleteHint')}</p></div><Button type="button" variant="outline" className="wwm-settings-delete" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} data-analytics-id="delete-meeting" disabled={renaming} onClick={()=>{setDeleteError('');setSettingsOpen(false);setDeleteOpen(true)}}>{t('settings.deleteMeeting')}</Button></section>}<DialogFooter className="wwm-settings-footer"><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={renaming} onClick={()=>setSettingsOpen(false)}>{t('common.cancel')}</Button><Button type="submit" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_DONE} disabled={!settingsName.trim()||titleInvalid||renaming}>{renaming?t('common.saving'):t('common.save')}</Button></DialogFooter></form></DialogContent></Dialog>
  {isOwner&&<AlertDialog open={deleteOpen} onOpenChange={open=>{if(!deleting)setDeleteOpen(open)}}><AlertDialogContent className="wwm-delete-dialog" onCloseAutoFocus={event=>{event.preventDefault();menuTrigger.current?.focus()}}><AlertDialogHeader><AlertDialogTitle>{deleteMeetingCopy(room.title,confirmedMeeting).title}</AlertDialogTitle><AlertDialogDescription>{deleteMeetingCopy(room.title,confirmedMeeting).description}</AlertDialogDescription></AlertDialogHeader>{deleteError&&<Notice tone="error">{deleteError}</Notice>}<AlertDialogFooter><AlertDialogCancel disabled={deleting} data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL}>{t('common.cancel')}</AlertDialogCancel><AlertDialogAction variant="destructive" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_DONE} data-analytics-id="delete-meeting-confirm" disabled={deleting} aria-busy={deleting||undefined} onClick={event=>{event.preventDefault();void removeMeeting()}}>{deleting?t('settings.deleting'):t('settings.deleteConfirm')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>}
  {responsesPromise&&<Suspense fallback={null}><RoomResponseLoader result={responsesPromise} onReady={applyResponses}/></Suspense>}
  {!responsesReady?(responsesError?<Notice tone="error" className="wwm-section-error" title={loadErrorTitle(room.title)} action={<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>void retryResponses()}>{t('common.retry')}</Button>}>{t('room.loadErrorDetail')}</Notice>:<AvailabilitySkeleton days={new Set(slots.map(slot=>slot.date)).size} rows={new Set(slots.map(slot=>slot.time)).size}/>):<section className="wwm-card wwm-availability" data-analytics-section={ANALYTICS_SECTIONS.WWM_ROOM}>
  <Tabs value={view} onValueChange={next=>selectTab(next as typeof view)}><div className="wwm-tabs-row"><TabsList className="wwm-view-switch" aria-label={t('room.views')}>{(Object.keys(tabNames) as Array<keyof typeof tabNames>).map(tab=><TabsTrigger key={tab} value={tab} type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_TAB} data-analytics-id={tab}>{tabNames[tab]}</TabsTrigger>)}<TabIndicator value={view}/></TabsList>
  {/* The live region announces one plain sentence; the visible line (with the rolling count) is hidden from AT so the number is not read twice. */}
  {(view==="availability"||save.tone!=="idle")&&<div className="wwm-save-state" data-tone={save.tone}><span className="wwm-sr-only" role="status">{save.text?`${save.text} · ${t('room.selected',{count:mine.length})}`:''}</span><span aria-hidden="true">{save.text&&<>{save.text} · </>}{rich(t('room.selected',{count:mine.length}),String(mine.length),<RollingNumber value={mine.length}/>)}</span>{save.tone==='error'&&<Button type="button" variant="ghost" size="sm" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={sync.retry}>{t('common.retry')}</Button>}</div>}</div>
  <TabsContent value={view} className="wwm-tab-panel"><div className="wwm-tab-reveal" key={view}>{view==='confirm'?<ConfirmTab roomId={room.id} room={room} slots={slots} responses={responses} onConfirmation={setConfirmation}/>:view==='people'?<PeoplePanel roomId={room.id} userId={userId}/>:<WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={responses} currentUserId={userId||''} mine={mine} dirty={dirty} onToggle={sync.toggle} readOnly={view==='everyone'} toolbar={fill} hint={joined&&view==='availability'&&mine.length===0?t('room.addYourTimes'):undefined}/>}</div></TabsContent></Tabs></section>}</>}
  </div></main>;
}
