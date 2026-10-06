import {validateDateConfirmation,dateConfirmationFingerprint,dateConfirmationEventId} from './date-confirmation.mjs';
import {confirmDateMeeting,editDateMeeting,resendDateMeeting} from './date-confirmation-flow.mjs';
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const reject=(status=400)=>response({error:'Invalid date confirmation request.'},status);
const cancel=r=>{try{void r.cancel().catch(()=>{});}catch{/* already closed */}};
async function inputBody(request){
 if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')??'')||!request.body)return null;
 const r=request.body.getReader(),abort=()=>cancel(r);request.signal.addEventListener('abort',abort,{once:true});
 try{const length=request.headers.get('content-length');if(request.signal.aborted||length!==null&&/^\d+$/.test(length)&&Number(length)>8192){cancel(r);return null;}
 const bytes=new Uint8Array(8192);let size=0;while(true){const {done,value}=await r.read();if(request.signal.aborted)return null;if(done)break;if(value.byteLength>8192-size){cancel(r);return null;}bytes.set(value,size);size+=value.byteLength;}
 const x=JSON.parse(new TextDecoder().decode(bytes.subarray(0,size)));return x&&typeof x==='object'&&!Array.isArray(x)?x:null;
 }catch{cancel(r);return null;}finally{request.signal.removeEventListener('abort',abort);r.releaseLock();}
}
function preflight(input,mode,roomId){
 if(!input||!['send','reconcile'].includes(input.action)||mode==='resend'&&input.action!=='send')return false;
 const keys=input.action==='reconcile'||mode==='resend'?['action']:['action','roomId','date','title','revision','recipients','excluded','optional','startDate','endDate'];
 if(Object.keys(input).some(k=>!keys.includes(k))||Object.hasOwn(input,'roomId')&&input.roomId!==roomId)return false;
 if(input.action==='send'&&mode!=='resend'&&(!Number.isSafeInteger(input.revision)||(mode==='initial'?input.revision!==1:input.revision<2)))return false;
 return true;
}
/** HTTP policy and pure flow execution; runtime injects authenticated RLS and Calendar adapters. */
export async function handleDateConfirmationRequest(request,roomId,mode,deps){
 try{
 if(!['initial','update','resend'].includes(mode)||!uuid(roomId))return reject();
 if(!['GET','POST'].includes(request.method)||request.method==='GET'&&mode!=='initial')return reject(405);
 let input;
 if(request.method==='POST'){if(!deps.sameOrigin(request))return reject(403);input=await inputBody(request);if(!preflight(input,mode,roomId))return reject();}
 const session=await deps.currentUser(),user=session?.user;
 if(!uuid(user?.id)||user.is_anonymous||!(user.app_metadata?.provider==='google'||user.app_metadata?.providers?.includes('google')))return response({error:'Sign in with Google to continue.'},401);
 const room=await deps.loadRoom(session,roomId);
 if(room.scheduleMode!=='date')return reject();
 if(request.method==='GET'){
 const status=await deps.loadStatus(session,roomId);
 const owner=room.role==='ADMIN'?await deps.loadOwner(session,roomId,user.id):null;
 const review=room.role==='ADMIN'?{attendees:await deps.attendees(session,roomId)}:null;
 return response({status,owner,review});
 }
 if(room.role!=='ADMIN')return reject(403);
 const stored=await deps.loadOwner(session,roomId,user.id);
 let valid,previous,claim;
 if(mode==='resend'){
 if(!stored||stored.root.status!=='confirmed'||stored.pending)return response({status:'not_confirmed'});
 valid=stored.root.valid;
 }else if(input.action==='reconcile'){
 if(!stored)return response({status:'conflict'});
 if(mode==='initial'){if(stored.root.valid.revision!==1)return response({status:'conflict'});valid=stored.root.valid;claim=stored.root.status==='confirmed'?'existing':'reconcile';}
 else{if(!stored.pending)return response({status:'conflict'});valid=stored.pending.valid;previous=stored.pending.previous;claim='reconcile';}
 }else{
 try{valid=validateDateConfirmation({...input,roomId},room,await deps.attendees(session,roomId));}catch{return reject();}
 if(mode==='update'){if(!stored||stored.root.status!=='confirmed')return response({status:'not_confirmed'});previous=stored.root.valid;
 if(valid.revision===previous.revision){const base=stored.revisions.find(x=>x.valid.revision===valid.revision-1&&x.status==='confirmed');if(!base)return response({status:'conflict'});previous=base.valid;}
 if(valid.revision!==previous.revision+1)return response({status:'conflict'});
 }
 }
 const eventId=stored?.root.eventId??dateConfirmationEventId(roomId,1),hash=dateConfirmationFingerprint(valid);
 const token=await deps.token(session);
 const callbacks={valid,eventId,reserve:()=>claim??deps.reserve(session,mode,valid,eventId,hash),getEvent:id=>deps.getEvent(session,token,id),insertEvent:body=>deps.insertEvent(session,token,body),patchEvent:(id,body,etag)=>deps.patchEvent(session,token,id,body,etag),finalize:(status,url)=>deps.finalize(session,mode,valid,eventId,status,url??null,hash)};
 const result=mode==='initial'?await confirmDateMeeting(callbacks):mode==='update'?await editDateMeeting({...callbacks,previous}):await resendDateMeeting(callbacks);
 return response(result);
 }catch(error){if(error?.reconnect)return response({error:'Reconnect Google Calendar to continue.',code:'calendar_reconnect',reconnect:true},409);
 const status=Number.isInteger(error?.status)&&[400,401,403,409,503].includes(error.status)?error.status:500;
 return response({error:status===503?'Date confirmation is unavailable.':'Could not process date confirmation.'},status);}
}
