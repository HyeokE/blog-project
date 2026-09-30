// Runs every WWM migration on an in-process Postgres (PGlite) with stubbed Supabase auth, then exercises
// the confirmation-revision, resend and rename RPCs as owner/member/anon and the runtime role.
// Skipped unless PGlite is resolvable: `npm i --no-save @electric-sql/pglite@0.3` or PGLITE_MODULE=/path/to/index.js.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
let PGlite=null;
try{({PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite'));}catch{/* optional dev dependency */}
if(!PGlite){test('SQL scenarios (PGlite not installed)',{skip:'install @electric-sql/pglite to run'},()=>{});}
else{
const M=new URL('../supabase/migrations/',import.meta.url).pathname;
async function setup(PGlite){
 const db=new PGlite();
 await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
 create schema auth; create table auth.users(id uuid primary key, email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt',true),''),'{}')::jsonb $$;
 grant usage on schema auth to authenticated, anon; grant execute on all functions in schema auth to authenticated, anon;
 grant usage on schema public to authenticated, anon;`);
 for(const f of ['20260929000000_wwm.sql','20260929000100_wwm_flat_slots.sql','20260930000000_wwm_participant_counts.sql','20260930000100_wwm_room_people.sql','20260930000200_wwm_confirmation.sql','20260930000300_wwm_calendar_private.sql','20261001000000_wwm_confirmation_revisions.sql']){
  try{await db.exec(readFileSync(M+f,'utf8'));}catch(e){throw new Error(f+': '+e.message);}
 }
 return db;
}
const O='11111111-1111-4111-8111-111111111111',Mb='33333333-3333-4333-8333-333333333333',X='44444444-4444-4444-8444-444444444444';
const h=c=>c.repeat(64);
const db=await setup(PGlite);
await db.exec(`insert into auth.users values('${O}','o@x.com'),('${Mb}','m@x.com'),('${X}','x@x.com')`);
async function as(user,sql,params=[]){
 await db.exec(`reset role; select set_config('request.uid','${user??''}',false), set_config('request.jwt','${JSON.stringify({app_metadata:{providers:['google']},is_anonymous:false})}',false); set role ${user?'authenticated':'anon'};`);
 try{return (await db.query(sql,params)).rows;}finally{await db.exec('reset role');}
}
async function runtime(sql,params=[]){await db.exec('set role wwm_calendar_runtime');try{return (await db.query(sql,params)).rows;}finally{await db.exec('reset role');}}
const code=async p=>{try{await p;return 'ok'}catch(e){return e.code||e.message}};
let room;
const S=(d,t)=>new Date(`${d}T${t}:00+09:00`).toISOString();
test('setup + first confirmation',async()=>{
 room=(await as(O,`select * from public.wwm_create_room('Sync','2026-10-01','2026-10-02','09:00','18:00','Asia/Seoul','Owner')`))[0];
 room=room.wwm_create_room?.id??room.id??Object.values(room)[0]?.id??Object.values(room)[0];
 if(typeof room==='object')room=room.id;
 const tok=(await db.query(`select invite_token from public.wwm_rooms where id=$1`,[room])).rows[0].invite_token;
 await as(Mb,`select public.wwm_join_room($1,$2,'Member')`,[room,tok]);
 const r=await as(O,`select public.wwm_reserve_confirmation($1,1,$2,'abcde12345',$3,$4,$5,$6,$7) s`,[room,h('a'),'Sync',S('2026-10-01','10:00'),S('2026-10-01','10:30'),[O,Mb],[]]);
 assert.equal(r[0].s,'reserved_reconcile_required');
 assert.equal((await runtime(`select wwm_calendar_private.finalize_confirmation($1,$2,'abcde12345',$3,'confirmed','https://www.google.com/calendar/event?eid=1') s`,[room,O,h('a')]))[0].s,'confirmed');
});
const upd=(user,rev,hash,title='Sync v2',s='11:00',e='12:00',rec=[O,Mb],exc=[],opt=[Mb])=>as(user,`select public.wwm_reserve_confirmation_update($1,$2,$3,$4,$5,$6,$7,$8,$9) s`,[room,rev,hash,title,S('2026-10-01',s),S('2026-10-01',e),rec,exc,opt]).then(r=>r[0].s);
const fin=(rev,hash,status,url=null)=>runtime(`select wwm_calendar_private.finalize_confirmation_update($1,$2,'abcde12345',$3,$4,$5,$6) s`,[room,O,rev,hash,status,url]).then(r=>r[0].s);
test('edit lifecycle: reserve, retry, conflict, reconcile, confirm, existing',async()=>{
 assert.equal(await upd(O,3,h('b')),'conflict');
 assert.equal(await upd(O,2,h('b')),'reserved_reconcile_required');
 assert.equal(await upd(O,2,h('b')),'reconcile');
 assert.equal(await upd(O,2,h('c'),'Other'),'conflict');
 // members still see revision 1 while the edit is open
 let st=await as(Mb,`select * from public.wwm_confirmation_status($1)`,[room]);
 assert.equal(st[0].revision,1);assert.equal(st[0].status,'confirmed');assert.equal(st[0].title,'Sync');
 assert.equal(await code(as(O,`select public.wwm_reserve_resend($1)`,[room])),'ok');
 assert.equal((await as(O,`select public.wwm_reserve_resend($1) s`,[room]))[0].s,'not_confirmed');
 const d=(await as(O,`select * from public.wwm_confirmation_owner_detail($1)`,[room]))[0];
 assert.equal(d.revision,1);assert.equal(d.open_revision,2);assert.equal(d.open_status,'pending');assert.deepEqual(d.open_optional_ids,[Mb]);assert.deepEqual(d.optional_ids,[]);
 assert.equal(await fin(2,h('b'),'reconciling'),'reconciling');
 assert.equal(await upd(O,2,h('b')),'reconcile');
 assert.equal(await code(fin(2,h('c'),'confirmed','https://www.google.com/calendar/event?eid=1')),'42501');
 assert.equal(await fin(2,h('b'),'confirmed','https://www.google.com/calendar/event?eid=1'),'confirmed');
 assert.equal(await fin(2,h('b'),'confirmed','https://www.google.com/calendar/event?eid=1'),'confirmed');
 st=await as(Mb,`select * from public.wwm_confirmation_status($1)`,[room]);
 assert.equal(st[0].revision,2);assert.equal(st[0].title,'Sync v2');assert.equal(new Date(st[0].starts_at).toISOString(),S('2026-10-01','11:00'));
 assert.equal(await upd(O,2,h('b')),'existing');
 const hist=(await db.query(`select revision,status from public.wwm_confirmation_revisions where room_id=$1 order by revision`,[room])).rows;
 assert.deepEqual(hist.map(r=>[r.revision,r.status]),[[1,'confirmed'],[2,'confirmed']]);
});
test('a definitely rejected edit reverts and the revision can be re-proposed',async()=>{
 assert.equal(await upd(O,3,h('d'),'Sync v3'),'reserved_reconcile_required');
 assert.equal(await fin(3,h('d'),'reverted'),'reverted');
 const st=await as(Mb,`select * from public.wwm_confirmation_status($1)`,[room]);
 assert.equal(st[0].revision,2);assert.equal(st[0].title,'Sync v2');
 assert.equal(await upd(O,3,h('e'),'Sync v3b'),'reserved_reconcile_required');
 assert.equal(await fin(3,h('e'),'confirmed','https://www.google.com/calendar/event?eid=1'),'confirmed');
 assert.equal((await as(O,`select * from public.wwm_confirmation_owner_detail($1)`,[room]))[0].revision,3);
});
test('validation mirrors the first reservation',async()=>{
 assert.equal(await code(upd(O,4,h('f'),'x','08:30','09:30')),'22023');
 assert.equal(await code(upd(O,4,h('f'),'x','10:15','11:00')),'22023');
 assert.equal(await code(upd(O,4,h('f'),' ')),'22023');
 assert.equal(await code(upd(O,4,h('f'),'x','10:00','11:00',[O],[])),'22023');
 assert.equal(await code(upd(O,4,h('f'),'x','10:00','11:00',[O],[Mb],[Mb])),'22023');
 assert.equal(await code(upd(O,4,h('f'),'x','10:00','11:00',[O,Mb,X],[])),'22023');
 assert.equal(await upd(O,4,h('f'),'x','17:00','18:00',[O],[Mb],[]),'reserved_reconcile_required');
 assert.equal(await fin(4,h('f'),'reverted'),'reverted');
});
test('non-owners and anon are refused; finalizers are runtime-only; no table reads',async()=>{
 assert.equal(await code(upd(Mb,4,h('f'))),'42501');
 assert.equal(await code(as(Mb,`select * from public.wwm_confirmation_owner_detail($1)`,[room])),'42501');
 assert.equal(await code(as(Mb,`select public.wwm_reserve_resend($1)`,[room])),'42501');
 assert.equal(await code(as(Mb,`select public.wwm_rename_room($1,'Hijack')`,[room])),'42501');
 assert.equal(await code(as(null,`select public.wwm_rename_room($1,'Hijack')`,[room])),'42501');
 assert.equal(await code(as(null,`select public.wwm_reserve_confirmation_update($1,4,$2,'x',now(),now(),'{}','{}','{}')`,[room,h('f')])),'42501');
 assert.equal(await code(as(O,`select * from public.wwm_confirmation_revisions`)),'42501');
 assert.equal(await code(as(O,`select wwm_calendar_private.finalize_confirmation_update($1,$2,'abcde12345',4,$3,'confirmed','https://www.google.com/calendar/x')`,[room,O,h('f')])),'42501');
 assert.equal(await code(as(O,`select wwm_calendar_private.finalize_resend($1,$2,'abcde12345','sent')`,[room,O])),'42501');
 assert.equal(await code(as(O,`select wwm_private.confirmation_claim(r,'x',now(),now(),'{}','{}','{}') from public.wwm_rooms r`)),'42501');
});
test('resend is limited to once per minute; a definite failure lifts the limit',async()=>{
 await db.query(`update public.wwm_confirmations set resend_reserved_at=null where room_id=$1`,[room]);
 const r=()=>as(O,`select public.wwm_reserve_resend($1) s`,[room]).then(x=>x[0].s);
 assert.equal(await r(),'reserved');assert.equal(await r(),'too_soon');
 assert.equal((await runtime(`select wwm_calendar_private.finalize_resend($1,$2,'abcde12345','failed') s`,[room,O]))[0].s,'failed');
 assert.equal(await r(),'reserved');
 assert.equal((await runtime(`select wwm_calendar_private.finalize_resend($1,$2,'abcde12345','sent') s`,[room,O]))[0].s,'sent');
 assert.equal(await r(),'too_soon');
 assert.ok((await as(O,`select * from public.wwm_confirmation_owner_detail($1)`,[room]))[0].last_resent_at);
});
test('rename trims, bounds and is owner-only',async()=>{
 assert.equal((await as(O,`select public.wwm_rename_room($1,'  New name  ') s`,[room]))[0].s,'New name');
 assert.equal((await db.query(`select title from public.wwm_rooms where id=$1`,[room])).rows[0].title,'New name');
 for(const t of ['   ','x'.repeat(101),'a\nb'])assert.equal(await code(as(O,`select public.wwm_rename_room($1,$2)`,[room,t])),'22023');
 assert.equal((await as(O,`select public.wwm_rename_room($1,$2) s`,[room,'가'.repeat(100)]))[0].s.length,100);
});
}
