'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {createAvailabilityAutosave,type AvailabilitySnapshot,type AutosaveState} from './autosave.mjs';
import {saveResponse,type Response} from './api';
import {toggleSlot} from './domain.mjs';

type Options={roomId?:string;userId?:string;enabled:boolean;initial:AvailabilitySnapshot;draft:AvailabilitySnapshot;onSaved:(v:AvailabilitySnapshot)=>void;onDraft:(v:AvailabilitySnapshot)=>void;onResponses:(v:Response[])=>void};
export function useAvailabilitySync(options:Options){
 const [state,setState]=useState<AutosaveState>('saved'),[connected,setConnected]=useState(false),[message,setMessage]=useState('');
 const queue=useRef<ReturnType<typeof createAvailabilityAutosave>|null>(null);
 const current=useRef(options),draft=useRef(options.draft);
 useEffect(()=>{current.current=options;draft.current=options.draft},[options]);
 const {roomId,userId,enabled}=options;
 useEffect(()=>{
  if(!roomId||!userId||!enabled)return;
  let disposed=false,events:EventSource|null=null;
  const controller=createAvailabilityAutosave({
   initial:current.current.initial,
   save:async(value,base)=>{const result=await saveResponse(roomId,value.name,value.slots,base);return result.value},
   onState:(next,error)=>{if(disposed)return;setState(next);setMessage(next==='error'?(error instanceof Error?error.message:'Could not save. Retry.'): '')},
   onSaved:value=>{if(!disposed)current.current.onSaved(value)},
   onDraft:value=>{if(!disposed){draft.current=value;current.current.onDraft(value)}},
  });
  queue.current=controller;
  const connect=()=>{
   events?.close();events=null;
   if(disposed||document.hidden)return;
   events=new EventSource(`/api/craft/when-we-meet/${encodeURIComponent(roomId)}/events`);
   events.addEventListener('availability',event=>{
    if(disposed)return;
    try{
     const payload=JSON.parse((event as MessageEvent).data) as {userId:string;responses:Response[]};
     if(payload.userId!==userId||!Array.isArray(payload.responses)){events?.close();setConnected(false);return}
     current.current.onResponses(payload.responses);setConnected(true);
     const self=payload.responses.find(row=>row.user_id===userId);
     if(self)controller.remote({name:self.display_name,slots:self.slots,version:self.updated_at});
    }catch{setConnected(false)}
   });
   events.onerror=()=>{if(!disposed)setConnected(false)};
  };
  const visibility=()=>{setConnected(false);connect()};
  const beforeUnload=(event:BeforeUnloadEvent)=>{if(controller.pending()){event.preventDefault();event.returnValue=''}};
  connect();document.addEventListener('visibilitychange',visibility);window.addEventListener('beforeunload',beforeUnload);
  return()=>{disposed=true;events?.close();controller.dispose();if(queue.current===controller)queue.current=null;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('beforeunload',beforeUnload)};
 },[roomId,userId,enabled]);
 const update=useCallback((value:AvailabilitySnapshot)=>{draft.current=value;current.current.onDraft(value);queue.current?.update(value)},[]);
 const toggle=useCallback((id:string)=>{update({...draft.current,slots:toggleSlot(draft.current.slots,id)})},[update]);
 const rename=useCallback((name:string)=>{update({...draft.current,name})},[update]);
 return {state,connected,message,toggle,rename,retry:()=>queue.current?.retry()};
}
