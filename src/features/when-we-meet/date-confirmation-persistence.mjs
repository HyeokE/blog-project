import {validateDateConfirmation,dateConfirmationFingerprint,dateConfirmationEventId} from './date-confirmation.mjs';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email=/^[^\s@\x00-\x1f\x7f]+@[^\s@.\x00-\x1f\x7f]+(?:\.[^\s@.\x00-\x1f\x7f]+)+$/;
const fail=()=>{throw Error('Invalid stored date confirmation');};
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
function snapshot(row,roomId){
 if(!record(row)||row.room_id!==roomId||row.schedule_mode!=='date'||row.starts_at!==null||row.ends_at!==null||!['pending','reconciling','confirmed','reverted'].includes(row.status))fail();
 const recipients=row.attendee_snapshot,excluded=row.excluded_snapshot;
 if(!Array.isArray(recipients)||!Array.isArray(excluded))fail();
 for(let i=0;i<recipients.length;i++){const x=recipients[i];if(!Object.hasOwn(recipients,i)||!record(x)||typeof x.optional!=='boolean'||typeof x.email!=='string'||x.email!==x.email.trim())fail();}
 for(let i=0;i<excluded.length;i++)if(!Object.hasOwn(excluded,i))fail();
 // This virtual room represents ONLY the stored civil interval and stored roster.
 // It grants no authorization, and never consults today's mutable room metadata.
 // Reuse the existing strict civil/email/UUID/partition schema, not fresh proposal policy.
 const valid=validateDateConfirmation({roomId,date:row.start_date,startDate:row.start_date,endDate:row.end_date,title:row.title,revision:row.revision,recipients:recipients.map(x=>x.userId),excluded,optional:recipients.filter(x=>x.optional).map(x=>x.userId)}, {id:roomId,scheduleMode:'date',startTime:null,endTime:null,startDate:row.start_date,endDate:row.start_date,timezone:row.timezone}, [...recipients,...excluded.map(userId=>({userId,email:null}))]);
 if(valid.title!==row.title||dateConfirmationFingerprint(valid)!==row.payload_hash)fail();
 if(row.status==='confirmed'&&(typeof row.google_event_url!=='string'||!/^https:\/\/www\.google\.com\/calendar\//.test(row.google_event_url)))fail();
 return Object.freeze({valid,status:row.status,payloadHash:row.payload_hash,url:row.status==='confirmed'?row.google_event_url:null});
}
/** Only call on the authorized owner RPC result. This normalizer grants no access. */
export function normalizeDateConfirmationOwner(data,roomId,ownerId){
 try{
 if(typeof roomId!=='string'||!uuid.test(roomId)||typeof ownerId!=='string'||!uuid.test(ownerId))fail();
 if(data===null)return null;
 if(!record(data)||!record(data.root)||!Array.isArray(data.revisions))fail();
 const r=data.root;
 if(r.organizer_id!==ownerId||typeof r.organizer_email!=='string'||!email.test(r.organizer_email)||r.organizer_email!==r.organizer_email.trim()||r.google_event_id!==dateConfirmationEventId(roomId,1)||r.status==='reverted')fail();
 const root=Object.freeze({...snapshot(r,roomId),eventId:r.google_event_id,organizerId:ownerId,organizerEmail:r.organizer_email});
 const revisions=[];const seen=new Set();
 if(root.status!=='confirmed'&&root.valid.revision!==1)fail();
 for(let i=0;i<data.revisions.length;i++){
 if(!Object.hasOwn(data.revisions,i))fail();
 const row=data.revisions[i],entry=snapshot(row,roomId);
 if(seen.has(entry.valid.revision)||entry.valid.revision===1&&row.base_revision!==null||entry.valid.revision>1&&row.base_revision!==entry.valid.revision-1)fail();
 if(entry.status==='confirmed'&&(entry.valid.revision>root.valid.revision||entry.valid.revision===root.valid.revision&&entry.payloadHash!==root.payloadHash))fail();
 seen.add(entry.valid.revision);revisions.push(Object.freeze({...entry,baseRevision:row.base_revision}));
 }
 const open=revisions.filter(x=>['pending','reconciling'].includes(x.status));
 if(open.length>1)fail();
 let pending=null;
 if(open.length){const e=open[0];if(root.status!=='confirmed'||e.baseRevision!==root.valid.revision||e.valid.revision!==root.valid.revision+1)fail();pending=Object.freeze({...e,previous:root.valid});}
 return Object.freeze({root,revisions:Object.freeze(revisions),pending});
 }catch{fail();}
}
