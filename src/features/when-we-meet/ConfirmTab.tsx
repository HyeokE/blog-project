'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useCallback,useEffect,useState} from 'react';
import {useCraftAccount} from '@/app/craft/CraftAccount';
import {Button} from '@/components/ui/button';
import {ConfirmationPanel} from './ConfirmationPanel';
import {connectGoogleCalendar,loadConfirmation,postConfirmation,postConfirmationUpdate,resendConfirmation,type Response,type Room} from './api';
import {confirmationBody,confirmFailure,confirmOutcome,confirmPanelState,confirmUpdateBody,normalizeConfirmationResponse,openEditBody,resendFailure,type ConfirmationData,type ConfirmPanelStatus,type ConfirmProposal,type ConfirmRequestBody,type ConfirmUpdateBody} from './confirm-tab.mjs';
import type {ConfirmationResendState} from './ConfirmationPanel';

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

export function ConfirmTab({roomId,room,slots,responses}:{roomId:string;room:Room;slots:Slot[];responses:Response[]}){
 const [data,setData]=useState<ConfirmationData|null>(null),[loadError,setLoadError]=useState(''),[attempt,setAttempt]=useState(0);
 const [local,setLocal]=useState<Local|null>(null),[recipientIds,setRecipientIds]=useState<string[]|undefined>();
 // Edit/resend of a confirmed meeting: request state lives here; the record itself stays visible (no skeleton on save).
 const [editLocal,setEditLocal]=useState<EditLocal|null>(null),[resend,setResend]=useState<ConfirmationResendState>({status:'idle'});
 const reload=useCallback(()=>{setLocal(null);setAttempt(value=>value+1)},[]);
 useEffect(()=>{
  const controller=new AbortController();
  setData(null);setLoadError('');
  loadConfirmation(roomId,controller.signal).then(result=>{if(!controller.signal.aborted)setData(result)},()=>{if(!controller.signal.aborted)setLoadError('Could not load the confirmation. Please try again.')});
  return()=>controller.abort();
 },[roomId,attempt]);
 const {user}=useCraftAccount();
 const ownerName=responses.find(row=>row.userId===room.ownerId)?.displayName;

 async function send(body:ConfirmRequestBody){
  setLocal({status:'pending'});storage.write(sentKey(roomId),JSON.stringify(body));
  try{
   const outcome=confirmOutcome(await postConfirmation(roomId,body));
   setRecipientIds(body.recipients);
   if(outcome.confirmation)setData(current=>current&&{...current,confirmation:outcome.confirmation});
   if(outcome.status==='confirmed'){storage.write(sentKey(roomId),null);if(outcome.confirmation?.status==='confirmed')setLocal(null);else reload();}
   else setLocal({status:'reconciling'});
  }catch(error){
   const failure=confirmFailure(error);
   if(!failure.retrySame)storage.write(sentKey(roomId),null);
   setLocal({status:'failed',error:failure.error,calendar:failure.calendar});
  }
 }
 function confirm(proposal:ConfirmProposal){
  if(!data?.review)return;
  let body:ConfirmRequestBody;
  try{body=confirmationBody({title:room.title,proposal,slots,attendeeIds:data.review.attendees.map(row=>row.userId)})}
  catch(error){setLocal({status:'failed',error:(error as Error).message});return}
  void send(body);
 }
 function checkAgain(){
  const saved=storage.read(sentKey(roomId));
  if(saved){try{void send(JSON.parse(saved) as ConfirmRequestBody);return}catch{storage.write(sentKey(roomId),null)}}
  reload();
 }
 async function sendEdit(body:ConfirmUpdateBody){
  setEditLocal({status:'pending'});setResend({status:'idle'});
  try{
   const result=await postConfirmationUpdate(roomId,body);
   // Same validation as the GET payload; the review (attendees) is kept, only the record and edit detail change.
   setData(current=>{if(!current)return current;try{const next=normalizeConfirmationResponse({confirmation:result.confirmation,review:current.review&&{...current.review,edit:result.edit}});return next}catch{return current}});
   setEditLocal(result.status==='confirmed'?{status:'saved'}:{status:'reconciling'});
  }catch(error){
   const failure=confirmFailure(error);
   setEditLocal({status:'failed',error:failure.error,calendar:failure.calendar});
  }
 }
 function edit(proposal:ConfirmProposal){
  const baseRevision=data?.review?.edit?.revision;
  if(!data?.review||!baseRevision)return;
  let body:ConfirmUpdateBody;
  try{body=confirmUpdateBody({title:room.title,proposal,slots,attendeeIds:data.review.attendees.map(row=>row.userId),baseRevision})}
  catch(error){setEditLocal({status:'failed',error:(error as Error).message});return}
  void sendEdit(body);
 }
 // Re-POSTs the server's own open edit (same payload): the server reads the event back and never notifies twice.
 function checkEdit(){const body=data&&openEditBody(data,slots);if(body)void sendEdit(body);else{setEditLocal(null);reload()}}
 async function resendInvites(){
  if(resend.status==='pending')return;
  setResend({status:'pending'});
  try{await resendConfirmation(roomId);setResend({status:'sent'})}
  catch(error){setResend({status:'failed',message:resendFailure(error).error})}
 }
 function connectCalendar(){storage.write(confirmReturnKey(roomId),'confirm');void connectGoogleCalendar(roomId,window.location.pathname+window.location.search).catch(()=>{storage.write(confirmReturnKey(roomId),null);setLocal({status:'failed',error:'Google Calendar connection is unavailable. Please try again.',calendar:'disconnected'})})}

 if(loadError)return <div className="wwm-confirm-load-error" role="alert" data-analytics-section={ANALYTICS_SECTIONS.WWM_CONFIRM}><p>{loadError}</p><Button type="button" variant="outline" data-analytics-label={ANALYTICS_ELEMENTS.RETRY} onClick={reload}>Retry</Button></div>;
 if(!data)return <div className="wwm-confirm wwm-confirm-skeleton" role="status" aria-label="Loading confirmation"><span className="wwm-confirm-skeleton-title"/><span className="wwm-confirm-skeleton-line"/><span className="wwm-confirm-skeleton-grid"/></div>;
 const state=confirmPanelState({data,slots,organizerName:ownerName,recipientIds});
 const status=local?.status??state.status;
 return <ConfirmationPanel
  room={{title:room.title,startDate:room.startDate,endDate:room.endDate,startTime:room.startTime,endTime:room.endTime,timezone:room.timezone}}
  role={state.role} members={state.members} slots={slots} responses={responses} currentUserId={user?.id||''} organizerEmail={state.organizerEmail}
  calendar={local?.calendar??editLocal?.calendar??state.calendar} status={status} confirmation={state.confirmation}
  error={local?.error??state.error}
  onRetry={state.role==='owner'?checkAgain:reload}
  onConnectCalendar={connectCalendar} onConfirm={confirm}
  edit={state.edit&&{initial:state.edit.initial,status:editLocal?.status??state.edit.status,error:editLocal?.error}}
  onEdit={edit} onCheckEdit={checkEdit} resend={resend} onResend={state.edit?()=>void resendInvites():undefined}/>;
}
