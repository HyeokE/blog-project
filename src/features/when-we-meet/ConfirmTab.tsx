'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {useCraftAccount} from '@/app/craft/CraftAccount';
import {Notice} from './Notice';
import {Button} from '@/components/ui/button';
import {ConfirmationPanel} from './ConfirmationPanel';
import {ConfirmSkeleton} from './ServerSkeletons';
import {toast} from 'sonner';
import {connectGoogleCalendar,loadConfirmation,postConfirmation,postConfirmationUpdate,type Response,type Room} from './api';
import {funnelComplete,funnelSignal} from './funnel';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import {confirmationBody,confirmFailure,confirmOutcome,confirmPanelState,confirmUpdateBody,normalizeConfirmationResponse,openEditBody,type ConfirmationData,type ConfirmationRecordData,type ConfirmPanelStatus,type ConfirmProposal,type ConfirmRequestBody,type ConfirmUpdateBody} from './confirm-tab.mjs';

type Slot={id:string;utc:string;date:string;time:string};
type Local={status:ConfirmPanelStatus;error?:string;calendar?:'disconnected'};
type EditLocal={status:'pending'|'reconciling'|'failed'|'saved';error?:string;calendar?:'disconnected'};
/** Tab to reopen after a Calendar consent round trip (read once by WhenWeMeet). */
export const confirmReturnKey=(roomId:string)=>`wwm:return-tab:${roomId}`;
// The last sent body, so a reconciling result can be re-checked with the SAME proposal (server reconciles, never double-sends).
const sentKey=(roomId:string)=>`wwm:confirm-sent:${roomId}`;
const storage={
 read(key:string){try{return window.sessionStorage.getItem(key)}catch{return null}},
 write(key:string,value:string|null){try{if(value===null)window.sessionStorage.removeItem(key);else window.sessionStorage.setItem(key,value)}catch{/* tab storage unavailable: retry falls back to a status refresh */}},
};

/** `onConfirmation` keeps the room header's status line in step with the record shown here. */
export function ConfirmTab({roomId,room,slots,responses,onConfirmation}:{roomId:string;room:Room;slots:Slot[];responses:Response[];onConfirmation?:(record:ConfirmationRecordData|null)=>void}){
 const {t,invitationsSentToast,MEETING_TOASTS}=useWwmCopy();
 const [data,setData]=useState<ConfirmationData|null>(null),[loadError,setLoadError]=useState(false),[attempt,setAttempt]=useState(0);
 const [local,setLocal]=useState<Local|null>(null),[recipientIds,setRecipientIds]=useState<string[]|undefined>();
 // Edit of a confirmed meeting: request state lives here; the record itself stays visible (no skeleton on save). Resend lives in the header menu.
 const [editLocal,setEditLocal]=useState<EditLocal|null>(null);
 const reload=useCallback(()=>{setLocal(null);setAttempt(value=>value+1)},[]);
 useEffect(()=>{
  const controller=new AbortController();
  setData(null);setLoadError(false);
  loadConfirmation(roomId,controller.signal).then(result=>{if(!controller.signal.aborted)setData(result)},()=>{if(!controller.signal.aborted)setLoadError(true)});
  return()=>controller.abort();
 },[roomId,attempt]);
 const record=data?.confirmation??null,loaded=data!==null;
 // Times are shown on the clock the slots are labelled with (`room.timezone` here is the viewed zone).
 const shown=useMemo(()=>data?.confirmation&&data.confirmation.timezone!==room.timezone?{...data,confirmation:{...data.confirmation,timezone:room.timezone}}:data,[data,room.timezone]);
 useEffect(()=>{if(loaded)onConfirmation?.(record)},[loaded,record,onConfirmation]);
 const {user}=useCraftAccount();
 const ownerName=responses.find(row=>row.userId===room.ownerId)?.displayName;

 async function send(body:ConfirmRequestBody){
  setLocal({status:'pending'});storage.write(sentKey(roomId),JSON.stringify(body));
  try{
   const outcome=confirmOutcome(await postConfirmation(roomId,body));
   setRecipientIds(body.recipients);
   if(outcome.confirmation)setData(current=>current&&{...current,confirmation:outcome.confirmation});
   if(outcome.status==='confirmed'){funnelComplete('confirm','sent',{recipient_count:body.recipients.length});storage.write(sentKey(roomId),null);toast.success(invitationsSentToast(body.recipients.length));if(outcome.confirmation?.status==='confirmed')setLocal(null);else reload();}
   else setLocal({status:'reconciling'});
  }catch(error){
   funnelSignal('confirm','submit_failed');
   const failure=confirmFailure(error,t);
   if(!failure.retrySame)storage.write(sentKey(roomId),null);
   setLocal({status:'failed',error:failure.error,calendar:failure.calendar});
  }
 }
 function confirm(proposal:ConfirmProposal){
  if(!data?.review)return;
  let body:ConfirmRequestBody;
  try{body=confirmationBody({title:room.title,proposal,slots,attendeeIds:data.review.attendees.map(row=>row.userId),t})}
  catch(error){setLocal({status:'failed',error:(error as Error).message});return}
  void send(body);
 }
 function checkAgain(){
  const saved=storage.read(sentKey(roomId));
  if(saved){try{void send(JSON.parse(saved) as ConfirmRequestBody);return}catch{storage.write(sentKey(roomId),null)}}
  reload();
 }
 async function sendEdit(body:ConfirmUpdateBody){
  setEditLocal({status:'pending'});
  try{
   const result=await postConfirmationUpdate(roomId,body);
   // Same validation as the GET payload; the review (attendees) is kept, only the record and edit detail change.
   setData(current=>{if(!current)return current;try{const next=normalizeConfirmationResponse({confirmation:result.confirmation,review:current.review&&{...current.review,edit:result.edit}});return next}catch{return current}});
   setEditLocal(result.status==='confirmed'?{status:'saved'}:{status:'reconciling'});
   if(result.status==='confirmed')toast.success(MEETING_TOASTS.editSaved);
  }catch(error){
   const failure=confirmFailure(error,t,'edit');
   setEditLocal({status:'failed',error:failure.error,calendar:failure.calendar});
  }
 }
 function edit(proposal:ConfirmProposal){
  const baseRevision=data?.review?.edit?.revision;
  if(!data?.review||!baseRevision)return;
  let body:ConfirmUpdateBody;
  try{body=confirmUpdateBody({title:room.title,proposal,slots,attendeeIds:data.review.attendees.map(row=>row.userId),baseRevision,t})}
  catch(error){setEditLocal({status:'failed',error:(error as Error).message});return}
  void sendEdit(body);
 }
 // Re-POSTs the server's own open edit (same payload): the server reads the event back and never notifies twice.
 function checkEdit(){const body=shown&&openEditBody(shown,slots);if(body)void sendEdit(body);else{setEditLocal(null);reload()}}
 function connectCalendar(){storage.write(confirmReturnKey(roomId),'confirm');void connectGoogleCalendar(roomId,window.location.pathname+window.location.search).catch(()=>{storage.write(confirmReturnKey(roomId),null);setLocal({status:'failed',error:t('confirm.calendarUnavailable'),calendar:'disconnected'})})}

 if(loadError)return <div data-analytics-section={ANALYTICS_SECTIONS.WWM_CONFIRM}><Notice tone="error" className="wwm-confirm-load-error" action={<Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={reload}>{t('common.retry')}</Button>}>{t('confirm.loadFailed')}</Notice></div>;
 if(!data)return <ConfirmSkeleton startDate={room.startDate} endDate={room.endDate} timezone={room.timezone} slots={slots}/>;
 const state=confirmPanelState({data:shown??data,slots,organizerName:ownerName,recipientIds,t});
 const status=local?.status??state.status;
 return <ConfirmationPanel
  room={{title:room.title,startDate:room.startDate,endDate:room.endDate,startTime:room.startTime,endTime:room.endTime,timezone:room.timezone}}
  role={state.role} members={state.members} slots={slots} responses={responses} currentUserId={user?.id||''} organizerEmail={state.organizerEmail}
  calendar={local?.calendar??editLocal?.calendar??state.calendar} status={status} confirmation={state.confirmation}
  error={local?.error??state.error}
  onRetry={state.role==='owner'?checkAgain:reload}
  onConnectCalendar={connectCalendar} onConfirm={confirm}
  edit={state.edit&&{initial:state.edit.initial,status:editLocal?.status??state.edit.status,error:editLocal?.error}}
  onEdit={edit} onCheckEdit={checkEdit}/>;
}
