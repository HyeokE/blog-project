import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDateConfirmationOwner} from '../src/features/when-we-meet/date-confirmation-persistence.mjs';
import {validateDateConfirmation,dateConfirmationFingerprint,dateConfirmationEventId} from '../src/features/when-we-meet/date-confirmation.mjs';
const roomId='11111111-1111-4111-8111-111111111111',ownerId='22222222-2222-4222-8222-222222222222';
const valid=validateDateConfirmation({roomId,date:'2000-02-29',title:'Meeting',revision:1,recipients:[ownerId]}, {id:roomId,scheduleMode:'date',startTime:null,endTime:null,startDate:'2000-02-29',endDate:'2000-02-29',timezone:'Asia/Seoul'},[{userId:ownerId,email:'Synthetic@example.test'}]);
const row=()=>({room_id:roomId,organizer_id:ownerId,organizer_email:'Synthetic@example.test',google_event_id:dateConfirmationEventId(roomId,1),payload_hash:dateConfirmationFingerprint(valid),revision:1,schedule_mode:'date',start_date:valid.startDate,end_date:valid.endDate,starts_at:null,ends_at:null,title:valid.title,timezone:valid.timezone,attendee_snapshot:valid.recipients.map(x=>({...x})),excluded_snapshot:[],status:'confirmed',google_event_url:'https://www.google.com/calendar/test'});
test('loads frozen historical snapshot independently of current range timezone roster',()=>{const x=normalizeDateConfirmationOwner({root:row(),revisions:[]},roomId,ownerId);assert.deepEqual(x.root.valid,valid);assert.ok(Object.isFrozen(x.root.valid.recipients[0]));assert.equal(x.root.eventId,dateConfirmationEventId(roomId,1));});
test('absent confirmation is null',()=>assert.equal(normalizeDateConfirmationOwner(null,roomId,ownerId),null));
for(const [key,value] of Object.entries({room_id:ownerId,organizer_id:roomId,organizer_email:'bad',google_event_id:'fake123',payload_hash:'a'.repeat(64),revision:0,schedule_mode:'time',start_date:'0000-01-01',end_date:'2000-03-02',starts_at:'2000-02-29T00:00Z',ends_at:undefined,title:' Meeting ',timezone:'invalid',attendee_snapshot:[],excluded_snapshot:[ownerId],status:'released'}))test('rejects malformed '+key,()=>assert.throws(()=>normalizeDateConfirmationOwner({root:{...row(),[key]:value},revisions:[]},roomId,ownerId),/^Error: Invalid stored date confirmation$/));
for(const value of [undefined,null,'false',1])test('requires explicit stored optional '+String(value),()=>{const r=row();r.attendee_snapshot[0].optional=value;assert.throws(()=>normalizeDateConfirmationOwner({root:r,revisions:[]},roomId,ownerId));});
test('confirmed history at root revision must match root snapshot',()=>{const r=row(),e={...row(),base_revision:null,title:'Different'};e.payload_hash=dateConfirmationFingerprint({...valid,title:e.title});assert.throws(()=>normalizeDateConfirmationOwner({root:r,revisions:[e]},roomId,ownerId));});
test('pending root cannot have edit revision',()=>{const r=row();r.status='pending';r.revision=2;r.payload_hash=dateConfirmationFingerprint({...valid,revision:2});assert.throws(()=>normalizeDateConfirmationOwner({root:r,revisions:[]},roomId,ownerId));});
test('pending edit must bind confirmed base revision',()=>{const r=row(),e={...r,revision:2,base_revision:1,status:'pending'};const v={...valid,revision:2};e.payload_hash=dateConfirmationFingerprint(v);const x=normalizeDateConfirmationOwner({root:r,revisions:[e]},roomId,ownerId);assert.equal(x.pending.previous.revision,1);assert.equal(x.pending.valid.revision,2);e.base_revision=2;assert.throws(()=>normalizeDateConfirmationOwner({root:r,revisions:[e]},roomId,ownerId));});
test('owner RPC enforces SQL authorization and returns actual hash-compatible rows',async(t)=>{
 const {readFileSync,readdirSync}=await import('node:fs');
 let PGlite,pgcrypto;
 try{const base=process.env.WWM_PGLITE_BASE;({PGlite}=await import(base?base+'/dist/index.js':'@electric-sql/pglite'));({pgcrypto}=await import(base?base+'/dist/contrib/pgcrypto.js':'@electric-sql/pglite/contrib/pgcrypto'));}catch{t.skip('Set WWM_PGLITE_BASE for isolated PostgreSQL verification.');return;}
 const db=new PGlite({extensions:{pgcrypto}});
 const q=async(s,p=[])=>(await db.query(s,p)).rows;
 async function role(id=ownerId,google=true,r='authenticated'){await db.exec('reset role');await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id,app_metadata:{providers:google?['google']:['email']},is_anonymous:false})]);await db.exec('set role '+r);}
 try{
 await db.exec(`create extension pgcrypto;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.jwt(),auth.uid() to anon,authenticated;`);
 const path=new URL('../supabase/migrations/',import.meta.url).pathname;
 for(const f of readdirSync(path).filter(x=>x.endsWith('.sql')).sort())await db.exec(readFileSync(path+f,'utf8'));
 await q('insert into auth.users values($1,$2),($3,$4)',[ownerId,'Synthetic@example.test',roomId,'Other@example.test']);
 await role();const id=(await q("select public.wwm_create_date_room('Meeting','2099-01-01','2099-01-04','Asia/Seoul','Owner') r"))[0].r.id;
 const v=validateDateConfirmation({roomId:id,date:'2099-01-01',title:'Meeting',revision:1,recipients:[ownerId]}, {id,scheduleMode:'date',startTime:null,endTime:null,startDate:'2099-01-01',endDate:'2099-01-04',timezone:'Asia/Seoul'},[{userId:ownerId,email:'Synthetic@example.test'}]);
 await q("select public.wwm_reserve_date_confirmation($1,1,$2,$3,'Meeting','2099-01-01','2099-01-02',$4::uuid[],'{}','{}')",[id,dateConfirmationFingerprint(v),dateConfirmationEventId(id,1),[ownerId]]);
 const data=(await q('select public.wwm_date_confirmation_owner_detail($1) d',[id]))[0].d;
 assert.deepEqual(normalizeDateConfirmationOwner(data,id,ownerId).root.valid,v);
 await assert.rejects(()=>q('select attendee_snapshot from public.wwm_confirmations'),e=>e.code==='42501');
 for(const [who,google,r] of [[roomId,true,'authenticated'],[ownerId,false,'authenticated'],[ownerId,true,'anon']]){await role(who,google,r);await assert.rejects(()=>q('select public.wwm_date_confirmation_owner_detail($1)',[id]),e=>e.code==='42501');}
 await db.exec('reset role');await q('delete from public.wwm_members where room_id=$1 and user_id=$2',[id,ownerId]);await role();await assert.rejects(()=>q('select public.wwm_date_confirmation_owner_detail($1)',[id]),e=>e.code==='42501');
 }finally{await db.close();}
});
test('errors never include stored email',()=>{const r=row();r.payload_hash='wrong';assert.throws(()=>normalizeDateConfirmationOwner({root:r,revisions:[]},roomId,ownerId),e=>!e.message.includes('@'));});
