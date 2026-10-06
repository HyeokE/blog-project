// Source contracts plus optional actual PostgreSQL behavior regressions.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
const read=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const sql=read('20261006000100_wwm_date_confirmation.sql');
const base=read('20260930000200_wwm_confirmation.sql');
const rev=read('20261001000000_wwm_confirmation_revisions.sql');
const block=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
test('additive tables retain time default and exclusive typed date checks',()=>{
 for(const t of ['wwm_confirmations','wwm_confirmation_revisions'])assert.ok(sql.includes('alter table public.'+t));
 for(const x of ["schedule_mode text not null default 'time'",'start_date date','end_date date','alter column starts_at drop not null','alter column ends_at drop not null','isfinite(start_date)',"start_date<date '9999-12-31'",'end_date=start_date+1','start_date is null and end_date is null'])assert.ok(sql.includes(x),x);
});
test('new RPC signatures preserve date and member array contracts',()=>{
 assert.match(sql,/wwm_reserve_date_confirmation\(\s*p_room_id uuid,p_revision integer,p_payload_hash text,p_event_id text,\s*p_title text,p_start_date date,p_end_date date,\s*p_recipient_ids uuid\[\],p_excluded_ids uuid\[\],p_optional_ids uuid\[\]/);
 assert.match(sql,/wwm_reserve_date_confirmation_update\(\s*p_room_id uuid,p_revision integer,p_payload_hash text,\s*p_title text,p_start_date date,p_end_date date/);
 for(const x of ["return 'reserved'","'reconcile'","'existing'","'conflict'","'not_confirmed'",'for update','for share of u','array_ndims','array_lower','count(distinct lower(btrim(u.email)))'])assert.ok(sql.includes(x),x);
});
test('immutable mode trigger never introduces root-to-room locks on insert or update',()=>{
 const trigger=block(sql,'create or replace function wwm_private.validate_confirmation_mode()', 'create or replace function public.wwm_reserve_confirmation(');
 const executable=trigger.replace(/--[^\n]*/g,'');
 assert.doesNotMatch(executable,/\bfor\s+(?:no\s+key\s+update|key\s+share|update|share)\b|\b(?:pg_advisory\w*|lock\s+table)\b/i);
 assert.match(executable,/select \* into r from public\.wwm_rooms where id=new\.room_id\s*;/);
 assert.match(trigger,/new\.schedule_mode is distinct from r\.schedule_mode/);
 assert.match(trigger,/tg_op='UPDATE' and new\.schedule_mode is distinct from old\.schedule_mode/);
 for(const table of ['wwm_confirmations','wwm_confirmation_revisions'])assert.ok(trigger.includes('before insert or update on public.'+table));
 const mode=read('20261006000000_wwm_date_mode.sql');
 assert.match(mode,/new\.schedule_mode is distinct from old\.schedule_mode/);
});
test('timed initial validation unchanged except explicit mode guard',()=>{
 const original=block(base,'create function public.wwm_reserve_confirmation(', '-- Members may read').replace('create function','create or replace function');
 const actual=block(sql,'create or replace function public.wwm_reserve_confirmation(', 'create or replace function wwm_private.confirmation_claim(');
 assert.equal(actual.replace("  if r.schedule_mode<>'time' then raise exception 'Time room required' using errcode='22023'; end if;\n",''),original);
});
test('timed shared validation unchanged except explicit mode guard',()=>{
 const original=block(rev,'create or replace function wwm_private.confirmation_claim(', '-- 4. Owner RPC:');
 const actual=block(sql,'create or replace function wwm_private.confirmation_claim(', 'create or replace function wwm_private.date_confirmation_claim(');
 assert.equal(actual.replace("  if r.schedule_mode<>'time' then raise exception 'Time room required' using errcode='22023'; end if;\n",''),original);
});
test('runtime finalizer changed only to copy mode and dates',()=>{
 const original=block(rev,'create or replace function wwm_calendar_private.finalize_confirmation_update(', '-- p_status: sent');
 const actual=block(sql,'create or replace function wwm_calendar_private.finalize_confirmation_update(', 'create or replace function public.wwm_date_confirmation_status(');
 assert.equal(actual.replace('schedule_mode=e.schedule_mode,start_date=e.start_date,end_date=e.end_date,',''),original);
});
test('sanitized JSON excludes identity addresses hashes and raw snapshots',()=>{
 const s=block(sql,'create or replace function public.wwm_date_confirmation_status(', 'revoke all on function public.wwm_date_confirmation_status');
 for(const x of ['schedule_mode','start_date','end_date','wwm_private.is_member'])assert.ok(s.includes(x));
 for(const x of ['organizer_email','attendee_snapshot','excluded_snapshot','payload_hash','read_credential'])assert.ok(!s.includes(x));
});
test('private functions denied and public RPCs scoped to authenticated',()=>{
 for(const signature of ['wwm_reserve_date_confirmation(uuid,integer,text,text,text,date,date,uuid[],uuid[],uuid[])','wwm_reserve_date_confirmation_update(uuid,integer,text,text,date,date,uuid[],uuid[],uuid[])','wwm_date_confirmation_status(uuid)']){
  assert.ok(sql.includes('revoke all on function public.'+signature+' from public,anon;'));
  assert.ok(sql.includes('grant execute on function public.'+signature+' to authenticated;'));
 }
 assert.ok(sql.includes('date_confirmation_claim(public.wwm_rooms,text,date,date,uuid[],uuid[],uuid[]) from public,anon,authenticated'));
 assert.ok(!sql.includes('read_credential('));assert.ok(!sql.includes('service_role'));
});

// Actual WASM PostgreSQL regression suite. Optional dependency; never a mock DB.
test('durable date snapshots survive availability range changes',async(t)=>{
 let PGlite,pgcrypto;
 try {
  const base=process.env.WWM_PGLITE_BASE;
  ({PGlite}=await import(base ? base+'/dist/index.js' : '@electric-sql/pglite'));
  ({pgcrypto}=await import(base ? base+'/dist/contrib/pgcrypto.js' : '@electric-sql/pglite/contrib/pgcrypto'));
 } catch(error) { t.skip('Actual DB skipped: install PGlite or set WWM_PGLITE_BASE; '+error.code);return; }
 const {readdirSync}=await import('node:fs');
 const root=new URL('../supabase/migrations/',import.meta.url).pathname;
const db=new PGlite({extensions:{pgcrypto}});const results=[],applied=[];
const q=async(s,p=[]) => (await db.query(s,p)).rows;
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333'];
async function role(i=0,r='authenticated',google=true){await db.exec('reset role');await q("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:ids[i],app_metadata:{providers:google?['google']:['email']},is_anonymous:false})]);await db.exec('set role '+r);}
async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,message:e.message,code:e.code});}}
async function deny(s,p=[],code){await assert.rejects(()=>q(s,p),e=>!code||e.code===code);}
try{
await db.exec(`set timezone='UTC';create extension pgcrypto;create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text);create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.jwt(),auth.uid() to anon,authenticated;`);
for(let i=0;i<ids.length;i++)await q('insert into auth.users values($1,$2)',[ids[i],`synthetic${i}@example.test`]);
let legacy,beforeLegacy;
for(const f of readdirSync(root).filter(x=>x.endsWith('.sql')).sort()){
 if(f==='20261006000100_wwm_date_confirmation.sql'){
  await role();legacy=(await q("select public.wwm_create_room('Legacy','2099-01-01','2099-01-04','00:00','24:00','UTC','Owner') r"))[0].r.id;
  await q("select public.wwm_reserve_confirmation($1,1,$2,'oldabc123','Legacy','2099-01-01 00:00Z','2099-01-01 01:00Z',$3::uuid[],'{}')",[legacy,'d'.repeat(64),[ids[0]]]);
  await db.exec('reset role;set role wwm_calendar_runtime');await q("select wwm_calendar_private.finalize_confirmation($1,$2,'oldabc123',$3,'confirmed','https://www.google.com/calendar/test')",[legacy,ids[0],'d'.repeat(64)]);await db.exec('reset role');beforeLegacy=(await q('select to_jsonb(c) s from public.wwm_confirmations c where room_id=$1',[legacy]))[0].s;
 }
 await db.exec(readFileSync(root+f,'utf8'));applied.push(f);
}

async function seed(kind='confirmed',edit=false){
 await db.exec('reset role;truncate public.wwm_confirmations cascade');
 await role();let id=(await q("select public.wwm_create_date_room('Durable','2099-01-01','2099-01-04','UTC','Owner') r"))[0].r.id;
 await q("select public.wwm_reserve_date_confirmation($1,1,$2,'durable123','Durable','2099-01-01','2099-01-02',$3::uuid[],'{}','{}')",[id,'a'.repeat(64),[ids[0]]]);
 if(kind==='confirmed'){await db.exec('reset role;set role wwm_calendar_runtime');await q("select wwm_calendar_private.finalize_confirmation($1,$2,'durable123',$3,'confirmed','https://www.google.com/calendar/test')",[id,ids[0],'a'.repeat(64)]);}
 if(edit){await role();await q("select public.wwm_reserve_date_confirmation_update($1,2,$2,'Edit','2099-01-02','2099-01-03',$3::uuid[],'{}','{}')",[id,'b'.repeat(64),[ids[0]]]);}
 await db.exec('reset role');await q("update public.wwm_rooms set start_date='2099-02-01',end_date='2099-02-04' where id=$1",[id]);await role();return id;
}
await check('durable status preserved after range move',async()=>{let id=await seed();let x=(await q('select public.wwm_date_confirmation_status($1) s',[id]))[0].s;assert.equal(x.start_date,'2099-01-01');assert.equal(x.status,'confirmed');assert.ok(!JSON.stringify(x).includes('@'));});
await check('durable resend after range move',async()=>{let id=await seed();assert.equal((await q('select public.wwm_reserve_resend($1) r',[id]))[0].r,'reserved');});
await check('cached confirmed initial retry after range move',async()=>{let id=await seed();assert.equal((await q("select public.wwm_reserve_date_confirmation($1,1,$2,'durable123','Durable','2099-01-01','2099-01-02',$3::uuid[],'{}','{}') r",[id,'a'.repeat(64),[ids[0]]]))[0].r,'existing');});
await check('new current-range edit copies durable old history',async()=>{let id=await seed();assert.equal((await q("select public.wwm_reserve_date_confirmation_update($1,2,$2,'Edit','2099-02-02','2099-02-03',$3::uuid[],'{}','{}') r",[id,'b'.repeat(64),[ids[0]]]))[0].r,'reserved');});
for(const status of ['confirmed','reconciling'])await check('durable pending root finalize '+status+' after range move',async()=>{let id=await seed('pending');await db.exec('reset role;set role wwm_calendar_runtime');assert.equal((await q("select wwm_calendar_private.finalize_confirmation($1,$2,'durable123',$3,$4,'https://www.google.com/calendar/test') r",[id,ids[0],'a'.repeat(64),status]))[0].r,status);});
for(const status of ['confirmed','reconciling','reverted'])await check('durable pending edit finalize '+status+' after range move',async()=>{let id=await seed('confirmed',true);await db.exec('reset role;set role wwm_calendar_runtime');assert.equal((await q("select wwm_calendar_private.finalize_confirmation_update($1,$2,'durable123',2,$3,$4,'https://www.google.com/calendar/test') r",[id,ids[0],'b'.repeat(64),status]))[0].r,status);});
await check('cached pending edit retry after range move',async()=>{let id=await seed('confirmed',true);assert.equal((await q("select public.wwm_reserve_date_confirmation_update($1,2,$2,'Edit','2099-01-02','2099-01-03',$3::uuid[],'{}','{}') r",[id,'b'.repeat(64),[ids[0]]]))[0].r,'reconcile');});
await check('changed existing outside-range claim conflicts',async()=>{let id=await seed('pending');assert.equal((await q("select public.wwm_reserve_date_confirmation($1,1,$2,'abc123','New','2099-01-03','2099-01-04',$3::uuid[],'{}','{}') r",[id,'c'.repeat(64),[ids[0]]]))[0].r,'conflict');});

await check('fresh initial outside current range rejected',async()=>{await role();const id=(await q("select public.wwm_create_date_room('Fresh','2099-02-01','2099-02-04','UTC','Owner') r"))[0].r.id;await deny("select public.wwm_reserve_date_confirmation($1,1,$2,'fresh123','Fresh','2099-01-01','2099-01-02',$3::uuid[],'{}','{}')",[id,'a'.repeat(64),[ids[0]]],'22023');});
for(const [label,title,start,end,rec,exc,opt] of [
 ['title','Changed','2099-01-01','2099-01-02',[ids[0]],[],[]],
 ['date','Durable','2099-01-02','2099-01-03',[ids[0]],[],[]],
 ['optional recipient','Durable','2099-01-01','2099-01-02',[ids[0]],[],[ids[0]]]
]) await check('reused hash changed '+label+' conflicts',async()=>{const id=await seed();assert.equal((await q("select public.wwm_reserve_date_confirmation($1,1,$2,'durable123',$3,$4,$5,$6::uuid[],$7::uuid[],$8::uuid[]) r",[id,'a'.repeat(64),title,start,end,rec,exc,opt]))[0].r,'conflict');});
await check('historical retry still requires Google owner',async()=>{const id=await seed();await role(0,'authenticated',false);await deny("select public.wwm_reserve_date_confirmation($1,1,$2,'durable123','Durable','2099-01-01','2099-01-02',$3::uuid[],'{}','{}')",[id,'a'.repeat(64),[ids[0]]],'42501');});
await check('historical retry still requires current membership',async()=>{const id=await seed();await db.exec('reset role');await q('delete from public.wwm_members where room_id=$1',[id]);await role();await deny("select public.wwm_reserve_date_confirmation($1,1,$2,'durable123','Durable','2099-01-01','2099-01-02',$3::uuid[],'{}','{}')",[id,'a'.repeat(64),[ids[0]]],'42501');});
await check('historical retry rejects invalid civil interval',async()=>{const id=await seed();await deny("select public.wwm_reserve_date_confirmation($1,1,$2,'durable123','Durable','2099-01-01','2099-01-03',$3::uuid[],'{}','{}')",[id,'a'.repeat(64),[ids[0]]],'22023');});
await check('new revised proposal outside current range rejected',async()=>{const id=await seed();await deny("select public.wwm_reserve_date_confirmation_update($1,2,$2,'Edit','2099-01-02','2099-01-03',$3::uuid[],'{}','{}')",[id,'b'.repeat(64),[ids[0]]],'22023');});
}catch(e){results.push({name:'HARNESS BLOCKER',pass:false,message:e.message,code:e.code});}

 await db.close();
 assert.equal(applied.length,13,'all original migrations applied');
 for(const result of results) await t.test(result.name,()=>assert.equal(result.pass,true,result.message));
});
