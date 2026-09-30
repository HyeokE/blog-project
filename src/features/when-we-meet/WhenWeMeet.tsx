'use client';
import WallBackLink from '@/container/light-wall/WallBackLink';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { makeSlots } from './domain.mjs';
import {creationErrors,revalidateCreationErrors,todayInTimezone,type CreationErrors,type CreationField} from './creation-validation.mjs';
import './creation-control.css';
import { connectGoogleCalendar, createRoom, joinRoom, loadRoom, renameRoom, signInWithGoogle, type Response, type Room } from './api';
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
import {Share2} from 'lucide-react';
import {GoogleSignInButton} from '@/components/craft/GoogleSignInButton';
import {Input} from '@/components/ui/input';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import {Tabs,TabsList,TabsTrigger,TabsContent} from '@/components/ui/tabs';
import {RollingNumber} from '@/components/craft/RollingNumber.mjs';
import {useAvailabilitySync} from './useAvailabilitySync';
import './room-toolbar.css';
import {TimeRangeFields} from './TimeRangeFields';
import './invite-link-dialog.css';
import {toast} from 'sonner';
import {InvitationLanding} from './InvitationLanding';
import {invitationPath,markInviteReturn,consumeInviteReturn,clearInviteReturn,profileName} from './invitation.mjs';
import {Dialog,DialogContent,DialogDescription,DialogFooter,DialogHeader,DialogTitle} from '@/components/ui/dialog';

import {deviceTimezone} from './timezone-options.mjs';
import {Suspense} from 'react';
import {RoomResponseLoader,type RoomResponseResult} from './RoomResponseLoader';
import {AvailabilitySkeleton} from './ServerSkeletons';
import {PeoplePanel} from './PeoplePanel';
import {CalendarFill} from './CalendarFill';
import {ConfirmTab,confirmReturnKey} from './ConfirmTab';
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
export default function WhenWeMeet({roomId,initialRoom,meetingsSection,responsesPromise}:{responsesPromise?:Promise<RoomResponseResult>;roomId?:string;initialRoom?:{room:Room;responses:Response[];userId:string}|null;meetingsSection?:React.ReactNode}) {
  const router=useRouter();
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
  useEffect(()=>{if(!showCreate){return;}const refresh=()=>{const clock=new Date();setToday(todayInTimezone(form.timezone,clock)||'');setFieldErrors(old=>{const next=revalidateCreationErrors(old,{...form,name},clock);return JSON.stringify(old)===JSON.stringify(next)?old:next})};refresh();const timer=window.setInterval(refresh,30000);return()=>window.clearInterval(timer)},[showCreate,form,name]);
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
  async function login(){setError('');if(!roomId&&(form.title||form.startDate||form.endDate||name||form.startTime!==initial.startTime||form.endTime!==initial.endTime||form.timezone!==defaultTimezone.current)){saveDraft(window.sessionStorage,{form,name});}if(loginPrompt){markCreateReturn(window.sessionStorage,window.location.pathname)}try{await signInWithGoogle(window.location.pathname+window.location.search);}catch(e){consumeCreateReturn(window.sessionStorage,window.location.pathname);setError(`Google login unavailable: ${(e as Error).message}`);setLoginPrompt(false);setShowCreate(true);}}
  useEffect(()=>{if(roomId){setToken(new URLSearchParams(window.location.search).get('invite')||'');setInviteReady(true);}},[roomId]);
  useEffect(()=>{if(roomId&&!room&&!accountLoading&&profile){const fallback=profileName(profile.user_metadata);if(fallback){setName(previous=>previous||fallback);setNameReady(true)}}},[roomId,room,accountLoading,profile]);
  const slots=useMemo(()=>room?makeSlots(room) as Slot[]:[],[room]);
  const [responsesReady,setResponsesReady]=useState(!responsesPromise),[responsesError,setResponsesError]=useState('');
  const applyResponses=useCallback((result:RoomResponseResult)=>{if(result.error){setResponsesError(result.error);return;}const rows=result.responses||[];const self=rows.find(row=>row.userId===initialRoom?.userId);setResponses(rows);setName(self?.displayName||'');setMine(self?.slots||[]);setSavedName(self?.displayName||'');setSavedMine(self?.slots||[]);setResponsesError('');setResponsesReady(true)},[initialRoom?.userId]);
  async function retryResponses(){if(!roomId)return;setResponsesError('');try{const result=await loadRoom(roomId);applyResponses({responses:result.responses})}catch{setResponsesError('Could not load availability. Please try again.')}}
  const [createdLink,setCreatedLink]=useState('');
  const [view,setView]=useState<'availability'|'everyone'|'people'|'confirm'>('availability');
  const [savedMine,setSavedMine]=useState<string[]>(initialRoom?.responses.find(x=>x.userId===initialRoom.userId)?.slots||[]),[savedName,setSavedName]=useState(initialRoom?.responses.find(x=>x.userId===initialRoom.userId)?.displayName||'');
  const dirty=Boolean(room)&&(name!==savedName||mine.length!==savedMine.length||mine.some(id=>!savedMine.includes(id)));
  const tabNames={availability:'Availability',everyone:'Everyone',people:'People',confirm:'Confirm'} as const;
  // After a Calendar consent round trip started from Confirm, reopen that tab once (never re-sends anything).
  useEffect(()=>{if(!roomId)return;try{const key=confirmReturnKey(roomId);if(window.sessionStorage.getItem(key)==='confirm'){window.sessionStorage.removeItem(key);setView('confirm')}}catch{/* tab storage unavailable */}},[roomId]);
  // Calendar consent returns with ?calendar=<outcome>: announce once, drop the flag, fetch/apply nothing.
  useEffect(()=>{if(!roomId)return;const url=new URL(window.location.href);const notice=calendarReturnNotice(url.searchParams.get('calendar'));if(!url.searchParams.has('calendar'))return;url.searchParams.delete('calendar');window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);if(notice)(notice.tone==='success'?toast.success:notice.tone==='error'?toast.error:toast.info)(notice.text)},[roomId]);
  function selectTab(next:typeof view){setView(next)}

  async function create(e:React.FormEvent){e.preventDefault();if(busy||accountLoading||createPending.current){return;}setCreateError('');const errors=creationErrors({...form,name},new Date());setToday(todayInTimezone(form.timezone)||'');setFieldErrors(errors);const first=(['title','dates','timezone','name'] as CreationField[]).find(key=>errors[key]);if(first){requestAnimationFrame(()=>document.getElementById({title:'wwm-create-title-input',dates:'wwm-range-trigger',timezone:'wwm-create-timezone',name:'wwm-create-name'}[first])?.focus());return}if(!profile){saveDraft(window.sessionStorage,{form,name});promptAfterClose.current=true;setShowCreate(false);return}createPending.current=true;setBusy(true);setStatus('Creating room…');try{const result=await createRoom({title:form.title,startDate:form.startDate,endDate:form.endDate,startTime:form.startTime,endTime:form.endTime,timezone:form.timezone},name.trim());clearDraft(window.sessionStorage);if(ownerId){router.refresh()}setCreatedLink(`${window.location.origin}/craft/when-we-meet/${result.id}?invite=${result.inviteToken}`);setStatus('');setShowCreate(false);setForm(initial);setName('');setFieldErrors({});toast.success('Room created. Copy the invitation link.');}catch(e){setCreateError((e as Error).message);setStatus('');}finally{createPending.current=false;setBusy(false)}}
  const join=useCallback(async()=>{if(joinPending.current||!roomId||!invitationPath(roomId,token)||!name.trim()){return;}joinPending.current=true;setBusy(true);setError('');setStatus('Joining room…');try{await joinRoom(roomId,token,name.trim());const result=await loadRoom(roomId);setRoom(result.room);setResponses(result.responses);const self=result.responses.find(x=>x.userId===result.userId);setMine(self?.slots||[]);setSavedMine(self?.slots||[]);setSavedName(self?.displayName||name.trim());setStatus('');clearInviteReturn(window.sessionStorage);router.refresh();}catch(e){setError((e as Error).message);setStatus('');}finally{joinPending.current=false;setBusy(false)}},[roomId,token,name,router]);
  useEffect(()=>{if(!roomId||room||!inviteReady||accountLoading||!profile||!nameReady||!name.trim()||error){return;}const path=invitationPath(roomId,token);if(!path||joinAttempted.current===path){return;}joinAttempted.current=path;consumeInviteReturn(window.sessionStorage,path);void join();},[roomId,room,inviteReady,accountLoading,profile,nameReady,name,token,error,join]);
  const [settingsOpen,setSettingsOpen]=useState(false),[settingsName,setSettingsName]=useState('');
  // Owner-only meeting rename; members never see the field (the server re-checks ownership).
  const [settingsTitle,setSettingsTitle]=useState(''),[renameError,setRenameError]=useState(''),[renaming,setRenaming]=useState(false);
  const isOwner=Boolean(room&&(room.role==='ADMIN'||room.ownerId&&room.ownerId===(initialRoom?.userId||profile?.id)));
  const titleInvalid=isOwner&&(!settingsTitle.trim()||settingsTitle.trim().length>100);
  async function saveSettings(){
    if(!room||renaming||!settingsName.trim()||titleInvalid){return;}
    const title=settingsTitle.trim();
    if(isOwner&&title!==room.title){
      setRenaming(true);setRenameError('');
      try{const result=await renameRoom(room.id,title);setRoom(current=>current&&{...current,title:result.title});router.refresh();}
      catch(e){setRenameError((e as Error).message||'Could not rename the meeting.');setRenaming(false);return;}
      setRenaming(false);
    }
    sync.rename(settingsName.trim());setSettingsOpen(false);
  }
  // Controlled dialog without a DialogTrigger: Radix has no trigger to refocus, so return focus explicitly.
  const settingsTrigger=useRef<HTMLButtonElement>(null);
  const sync=useAvailabilitySync({roomId,userId:initialRoom?.userId||profile?.id,enabled:Boolean(room)&&Boolean(profile)&&responsesReady,initial:{name:savedName,slots:savedMine},draft:{name,slots:mine},onSaved:value=>{setSavedName(value.name);setSavedMine(value.slots)},onDraft:value=>{setName(value.name);setMine(value.slots)},onResponses:setResponses});
  async function share(){const invite=room?.inviteToken||token;if(!room||!invite){setError('Invitation link unavailable.');return}try{await navigator.clipboard.writeText(`${window.location.origin}/craft/when-we-meet/${room.id}?invite=${invite}`);toast.success('Invitation link copied.')}catch{setError('Could not copy the invitation link.')}}
  // The live region announces one plain sentence; the visible line (with the rolling count) is hidden from AT so the number is not read twice.
  const saveLabel=sync.state==='error'?'Not saved':sync.state==='saving'||sync.state==='pending'?'Saving…':dirty?'Changes pending':'All changes saved';
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return <main className={`wwm ${room?'wwm-room':!roomId?'wwm-index':''}`}><div className="wwm-topline"><WallBackLink href={roomId?'/craft/when-we-meet':'/craft'}>{roomId?'Meetings':'Craft'}</WallBackLink></div><div className="wwm-shell"><header><div className="wwm-hero-row"><h1>{room?.title||'When We Meet'}</h1>{room&&<div className="wwm-header-actions"><Button type="button" variant="ghost" size="icon" className="wwm-share-icon" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_COPY} aria-label="Share invitation link" title="Copy invitation link" onClick={()=>void share()}><Share2 size={18} aria-hidden="true"/></Button><Button ref={settingsTrigger} type="button" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_SETTINGS} disabled={!responsesReady} onClick={()=>{setSettingsName(name);setSettingsTitle(room.title);setRenameError('');setSettingsOpen(true)}}>Settings</Button></div>}{!roomId&&profile&&<Button className="wwm-new-meeting" ref={createTrigger} type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NEW} onClick={()=>{setToday(todayInTimezone(form.timezone)||'');setShowCreate(true)}}>New meeting</Button>}</div>{room?<p className="wwm-room-meta">{room.timezone}<span aria-hidden="true"> · </span>{sync.connected?'Live updates':'Connecting…'}</p>:<p>Find a time that works for everyone.</p>}</header>
  {!configured&&<section className="wwm-alert" role="alert"><strong>Connection required</strong><p>This service is not connected to Supabase yet. No room or availability can be saved. Ask the site owner to configure the shared project and review the migration. Google login must be enabled before room actions can work.</p></section>}
  {!roomId&&<Dialog open={loginPrompt} onOpenChange={open=>{setLoginPrompt(open);if(!open){setShowCreate(true)}}}><DialogContent className="wwm-login-dialog" onCloseAutoFocus={e=>{if(showCreate){e.preventDefault()}}}><DialogHeader><DialogTitle>Sign in with Google to create a room</DialogTitle><DialogDescription>Your draft stays in this tab. Sign in, then press Create room again.</DialogDescription></DialogHeader><DialogFooter><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} onClick={()=>{setLoginPrompt(false);setShowCreate(true)}}>Cancel</Button><GoogleSignInButton data-analytics-label={ANALYTICS_ELEMENTS.SIGN_IN} onClick={()=>void login()}/></DialogFooter></DialogContent></Dialog>}
  {error&&!(roomId&&!room&&configured)&&<p className="wwm-alert" role="alert">{error}</p>}{status&&<p role="status" aria-live="polite">{status}</p>}
  {!roomId&&configured&&accountLoading&&<LoadingState label="Checking your account" description="Getting your meetings ready."/>}
  {!roomId&&meetingsSection}
  {!roomId&&configured&&!accountLoading&&!profile&&<><section className="wwm-guest-stage" aria-label="Sign in to When We Meet" data-analytics-section={ANALYTICS_SECTIONS.WWM_MEETINGS}><GuestCalendarPreview/><div className="wwm-guest-panel"><h2>See everyone’s availability at a glance.</h2><p>Sign in to create a meeting and find a time together.</p><GoogleSignInButton data-analytics-label={ANALYTICS_ELEMENTS.SIGN_IN} onClick={()=>void login()}/><Button ref={createTrigger} type="button" className="wwm-guest-create" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NEW} onClick={()=>{setToday(todayInTimezone(form.timezone)||'');setShowCreate(true)}}>Create a room</Button></div></section><p className="wwm-guest-sample">Sample calendar · illustrative availability</p></>}
  {!roomId&&<Dialog open={showCreate} onOpenChange={open=>{if(!busy){setShowCreate(open);if(!open&&draftDirty){saveDraft(window.sessionStorage,{form,name})}}}}><DialogContent className="wwm-create-dialog" showCloseButton={!busy} onCloseAutoFocus={e=>{if(promptAfterClose.current){e.preventDefault();promptAfterClose.current=false;setLoginPrompt(true)}else{e.preventDefault();createTrigger.current?.focus()}}} onEscapeKeyDown={e=>{if(busy||document.querySelector('.wwm-range>.wwm-picker-trigger[aria-expanded="true"]')){e.preventDefault()}}} onPointerDownOutside={e=>{if(busy||e.target instanceof Element&&e.target.closest('.wwm-picker-panel,.wwm-range-panel')){e.preventDefault()}}} onOpenAutoFocus={e=>{e.preventDefault();requestAnimationFrame(()=>createTitle.current?.focus())}}><DialogHeader><DialogTitle ref={createTitle} tabIndex={-1}>New meeting</DialogTitle><DialogDescription className="wwm-sr-only">Choose the dates and times, then create your room.</DialogDescription></DialogHeader><form id="wwm-create-form" noValidate data-analytics-label={ANALYTICS_ELEMENTS.MEETING_CREATE_FORM} data-analytics-section={ANALYTICS_SECTIONS.WWM_CREATE} onSubmit={create}><div className="wwm-create-body"><div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-create-title-input">What are we planning?</RequiredFieldLabel><Input id="wwm-create-title-input" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_TITLE_INPUT} required maxLength={100} value={form.title} aria-invalid={Boolean(fieldErrors.title)} aria-describedby={fieldErrors.title?'wwm-create-title-error':undefined} onChange={e=>updateForm('title',e.target.value)} placeholder="Team coffee" />{fieldErrors.title&&<p id="wwm-create-title-error" className="wwm-field-error" role="alert">{fieldErrors.title}</p>}</div><div className="wwm-fields"><DateRangePicker start={form.startDate} end={form.endDate} minDate={today} error={fieldErrors.dates} onChange={(startDate,endDate)=>{setForm(old=>({...old,startDate,endDate}));clearField('dates')}}/>{fieldErrors.dates&&<p id="wwm-create-dates-error" className="wwm-field-error" role="alert">{fieldErrors.dates}</p>}</div><TimeRangeFields start={form.startTime} end={form.endTime} onChange={(startTime,endTime)=>setForm(old=>({...old,startTime,endTime}))}/><div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-create-timezone">Room timezone</RequiredFieldLabel><TimezoneCombobox id="wwm-create-timezone" required value={form.timezone} onChange={timezone=>{updateForm('timezone',timezone,'timezone');clearField('dates');setToday(todayInTimezone(timezone)||'')}} error={fieldErrors.timezone} aria-describedby={fieldErrors.timezone?'wwm-create-timezone-error':undefined} referenceDate={form.startDate}/>{fieldErrors.timezone&&<p id="wwm-create-timezone-error" className="wwm-field-error" role="alert">{fieldErrors.timezone}</p>}</div><div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-create-name">Your name</RequiredFieldLabel><Input id="wwm-create-name" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NAME_INPUT} required maxLength={50} value={name} aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name?'wwm-create-name-error':undefined} onChange={e=>{setName(e.target.value);clearField('name')}} placeholder="Your name"/>{fieldErrors.name&&<p id="wwm-create-name-error" className="wwm-field-error" role="alert">{fieldErrors.name}</p>}</div></div><div id="wwm-create-status" tabIndex={-1} className="wwm-create-status" role={createError?'alert':'status'} aria-live="polite">{createError||status==='Creating room…'&&status||''}</div><DialogFooter className="wwm-create-footer"><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={busy} onClick={()=>setShowCreate(false)}>Cancel</Button><Button data-analytics-label={ANALYTICS_ELEMENTS.MEETING_CREATE_SUBMIT} disabled={!configured||busy||accountLoading}>{busy?'Creating…':'Create room'}</Button></DialogFooter></form></DialogContent></Dialog>}
  {!roomId&&<Dialog open={Boolean(createdLink)} onOpenChange={open=>{if(!open)setCreatedLink('')}}><DialogContent className="wwm-invite-link-dialog" onCloseAutoFocus={event=>{event.preventDefault();createTrigger.current?.focus()}}><DialogHeader><DialogTitle>Invitation link</DialogTitle><DialogDescription>Your meeting is ready. Share this link with the people you want to invite.</DialogDescription></DialogHeader><Input aria-label="Invitation link" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_INPUT} readOnly value={createdLink} onFocus={event=>event.target.select()}/><DialogFooter><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_DONE} onClick={()=>setCreatedLink('')}>Done</Button><Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.INVITE_LINK_COPY} onClick={()=>navigator.clipboard.writeText(createdLink).then(()=>toast.success('Link copied.')).catch(()=>toast.error('Could not copy. Select the link and copy it manually.'))}>Copy link</Button></DialogFooter></DialogContent></Dialog>}
  {roomId&&!room&&configured&&<InvitationLanding signedIn={Boolean(profile)} loading={accountLoading||!inviteReady} busy={busy} valid={Boolean(invitationPath(roomId,token))} name={name} nameReady={nameReady} onName={setName} error={error} onSignIn={()=>{const path=invitationPath(roomId,token);if(!path){return;}if(!markInviteReturn(window.sessionStorage,path)){setError('This browser cannot preserve the invitation through Google sign-in. Enable tab storage and try again.');return;}void signInWithGoogle(path.split('?')[0]).catch(()=>{clearInviteReturn(window.sessionStorage);setError('Google login unavailable. Please try again.')})}} onJoin={()=>void join()} onRetry={()=>{joinAttempted.current='';setError('');void join()}}/>}
  {room&&<>
  <Dialog open={settingsOpen} onOpenChange={open=>{if(!renaming)setSettingsOpen(open)}}><DialogContent className="wwm-settings-dialog" onCloseAutoFocus={event=>{event.preventDefault();settingsTrigger.current?.focus()}} showCloseButton={!renaming}><DialogHeader><DialogTitle>Settings</DialogTitle><DialogDescription>{isOwner?'The meeting name everyone sees, and your name in this meeting.':'Your name in this meeting.'}</DialogDescription></DialogHeader><form data-analytics-label={ANALYTICS_ELEMENTS.MEETING_SETTINGS_FORM} noValidate onSubmit={event=>{event.preventDefault();void saveSettings()}}>{isOwner&&<div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-settings-title">Meeting name</RequiredFieldLabel><Input id="wwm-settings-title" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_RENAME_INPUT} required maxLength={100} value={settingsTitle} disabled={renaming} aria-invalid={titleInvalid||Boolean(renameError)} aria-describedby={renameError?'wwm-settings-title-error':undefined} onChange={event=>{setSettingsTitle(event.target.value);setRenameError('')}}/>{renameError&&<p id="wwm-settings-title-error" className="wwm-field-error" role="alert">{renameError}</p>}</div>}<div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-settings-name">Your name</RequiredFieldLabel><Input id="wwm-settings-name" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NAME_INPUT} required maxLength={50} value={settingsName} disabled={renaming} onChange={event=>setSettingsName(event.target.value)}/></div><DialogFooter><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_CANCEL} disabled={renaming} onClick={()=>setSettingsOpen(false)}>Cancel</Button><Button type="submit" data-analytics-label={ANALYTICS_ELEMENTS.DIALOG_DONE} disabled={!settingsName.trim()||titleInvalid||renaming}>{renaming?'Saving…':'Done'}</Button></DialogFooter></form></DialogContent></Dialog>
  {responsesPromise&&<Suspense fallback={null}><RoomResponseLoader result={responsesPromise} onReady={applyResponses}/></Suspense>}
  {!responsesReady?(responsesError?<section className="wwm-card" role="alert"><p>{responsesError}</p><Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={()=>void retryResponses()}>Retry availability</Button></section>:<AvailabilitySkeleton days={new Set(slots.map(slot=>slot.date)).size} rows={new Set(slots.map(slot=>slot.time)).size}/>):<section className="wwm-card wwm-availability" data-analytics-section={ANALYTICS_SECTIONS.WWM_ROOM}><div className="wwm-save-state"><span className="wwm-sr-only" role="status">{`${saveLabel} · ${mine.length} selected${sync.state==='error'&&sync.message?`. ${sync.message}`:''}`}</span><span aria-hidden="true">{saveLabel} · <RollingNumber value={mine.length}/> selected</span>{sync.state==='error'&&<><span aria-hidden="true">{sync.message}</span><Button type="button" variant="ghost" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={sync.retry}>Retry</Button></>}</div>
  <Tabs value={view} onValueChange={next=>selectTab(next as typeof view)}><TabsList className="wwm-view-switch" aria-label="Meeting views">{(Object.keys(tabNames) as Array<keyof typeof tabNames>).map(tab=><TabsTrigger key={tab} value={tab} type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_TAB} data-analytics-id={tab}>{tabNames[tab]}</TabsTrigger>)}<TabIndicator value={view}/></TabsList><TabsContent value={view} className="wwm-tab-panel"><div className="wwm-tab-reveal" key={view}>{view==='availability'&&<CalendarFill roomId={room.id} slots={slots} selected={mine} onApply={sync.replace} onReconnect={()=>void connectGoogleCalendar(room.id,window.location.pathname+window.location.search).catch(()=>setError('Google Calendar connection is unavailable. Please try again.'))}/>}{view==='confirm'?<ConfirmTab roomId={room.id} room={room} slots={slots} responses={responses}/>:view==='people'?<PeoplePanel roomId={room.id} userId={initialRoom?.userId||profile?.id}/>:<WeeklyAvailability startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots} responses={responses} currentUserId={initialRoom?.userId||profile?.id||''} mine={mine} dirty={dirty} onToggle={sync.toggle} readOnly={view==='everyone'}/>}</div></TabsContent></Tabs></section>}</>}
  </div></main>
}
