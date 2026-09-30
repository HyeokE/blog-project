import {mergeAvailability} from './availability-changes.mjs';
const copy=v=>({name:v.name,slots:[...new Set(v.slots)].sort(),...(v.version?{version:v.version}:{})});
const key=v=>JSON.stringify([v.name,v.slots]);
export function createAvailabilityAutosave({initial,save,onState=()=>{},onSaved=()=>{},onDraft=()=>{},delay=350}){
 let saved=copy(initial),latest=copy(initial),timer=null,deferredRemote=null,running=false,disposed=false,failed=false;
 const cancel=()=>{if(timer!==null)clearTimeout(timer);timer=null};
 const pending=()=>running||key(latest)!==key(saved);
 const schedule=()=>{cancel();if(disposed||running||failed)return;if(key(latest)===key(saved)){onState('saved');return}onState('pending');timer=setTimeout(flush,delay)};
 async function flush(){
  cancel();if(disposed||running||key(latest)===key(saved))return;
  running=true;failed=false;const submitted=copy(latest),base=copy(saved);onState('saving');
  try{
   const result=await save(submitted,base);
   if(disposed)return;
   let acknowledged=copy(result&&Array.isArray(result.slots)&&typeof result.name==='string'?result:submitted);
   if(deferredRemote?.version&&(!acknowledged.version||deferredRemote.version>acknowledged.version))acknowledged=deferredRemote;deferredRemote=null;
   latest=mergeAvailability(acknowledged,latest,submitted);saved=acknowledged;
   onSaved(copy(saved));onDraft(copy(latest));
  }catch(error){if(!disposed){failed=true;onState('error',error)}}
  finally{running=false;if(!disposed&&!failed)schedule()}
 }
 return {
  update(value){if(disposed)return;latest=copy(value);failed=false;schedule()},
  remote(value){
   if(disposed)return;
   const incoming=copy(value);
   if(running){if(!deferredRemote?.version||!incoming.version||incoming.version>deferredRemote.version)deferredRemote=incoming;return}
   if(incoming.version&&saved.version&&incoming.version<=saved.version)return;
   latest=mergeAvailability(incoming,latest,saved);saved=incoming;onSaved(copy(saved));onDraft(copy(latest));
   if(!failed)schedule();
  },
  retry(){if(disposed)return;failed=false;void flush()},
  flush,pending,
  dispose(){disposed=true;cancel()},
 };
}
