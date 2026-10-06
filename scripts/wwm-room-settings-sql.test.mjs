// Runs every WWM migration on PGlite with stubbed Supabase auth, then exercises the invitation preview
// and owner schedule/delete RPCs (20261001020000_wwm_room_settings.sql) as owner/member/outsider/anon.
// Skipped unless PGlite is resolvable: `npm i --no-save @electric-sql/pglite@0.3` or PGLITE_MODULE=/path/to/index.js.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
let PGlite=null;
try{({PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite'));}catch{/* optional dev dependency */}
if(!PGlite){test('room settings SQL (PGlite not installed)',{skip:'install @electric-sql/pglite to run'},()=>{});}
else{
const M=new URL('../supabase/migrations/',import.meta.url).pathname;
const db=new PGlite();
await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;
 create schema auth; create table auth.users(id uuid primary key, email text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt',true),''),'{}')::jsonb $$;
 grant usage on schema auth to authenticated, anon; grant execute on all functions in schema auth to authenticated, anon;
 grant usage on schema public to authenticated, anon;`);
for(const f of readdirSync(M).filter(name=>name.endsWith('.sql')).sort()){try{await db.exec(readFileSync(M+f,'utf8'));}catch(e){throw new Error(f+': '+e.message);}}
const O='11111111-1111-4111-8111-111111111111',Mb='33333333-3333-4333-8333-333333333333',X='44444444-4444-4444-8444-444444444444';
await db.exec(`insert into auth.users values('${O}','o@x.com'),('${Mb}','m@x.com'),('${X}','x@x.com')`);
async function as(user,sql,params=[]){
 await db.exec(`reset role; select set_config('request.uid','${user??''}',false), set_config('request.jwt','${JSON.stringify({app_metadata:{providers:['google']},is_anonymous:false})}',false); set role ${user?'authenticated':'anon'};`);
 try{return (await db.query(sql,params)).rows;}finally{await db.exec('reset role');}
}
const code=async p=>{try{await p;return 'ok'}catch(e){return e.code||e.message}};
const S=(d,t)=>new Date(`${d}T${t}:00+09:00`).toISOString();
const future=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
const plus=(d,n)=>new Date(Date.parse(d+'T00:00:00Z')+n*864e5).toISOString().slice(0,10);
let room,token;
test('setup',async()=>{
 const row=(await as(O,`select public.wwm_create_room('Team coffee',$1,$2,'09:00','12:00','Asia/Seoul','Alex') r`,[future,plus(future,2)]))[0].r;
 room=row.id;token=row.invite_token;
 await as(Mb,`select public.wwm_join_room($1,$2,'Morgan')`,[room,token]);
 await as(O,`update public.wwm_responses set slots=$2 where room_id=$1 and user_id=auth.uid()`,[room,[S(future,'09:00'),S(plus(future,2),'11:30')]]);
 await as(Mb,`update public.wwm_responses set slots=$2 where room_id=$1 and user_id=auth.uid()`,[room,[S(future,'10:00')]]);
});
test('invitation preview: anon with the right token sees only title, dates, timezone, organizer name',async()=>{
 const rows=await as(null,`select * from public.wwm_invitation_preview($1,$2)`,[room,token]);
 assert.equal(rows.length,1);
 assert.deepEqual(Object.keys(rows[0]).sort(),['end_date','organizer_name','start_date','timezone','title']);
 assert.equal(rows[0].title,'Team coffee');assert.equal(rows[0].organizer_name,'Alex');assert.equal(rows[0].timezone,'Asia/Seoul');
 assert.equal((await as(X,`select * from public.wwm_invitation_preview($1,$2)`,[room,token])).length,1);
 assert.equal((await as(null,`select * from public.wwm_invitation_preview($1,$2)`,[room,X])).length,0,'wrong token → no row');
 assert.equal((await as(null,`select * from public.wwm_invitation_preview($1,null)`,[room])).length,0);
 // anon still cannot read rooms directly
 assert.notEqual(await code(as(null,`select * from public.wwm_rooms`)),'ok');
});
test('schedule edit: owner only, validated, trims saved availability outside the window',async()=>{
 const call=(user,s,e,st,et,tz='Asia/Seoul')=>as(user,`select * from public.wwm_update_room_schedule($1,$2,$3,$4,$5,$6)`,[room,s,e,st,et,tz]);
 assert.equal(await code(call(Mb,future,plus(future,1),'09:00','11:00')),'42501');
 assert.equal(await code(call(X,future,plus(future,1),'09:00','11:00')),'42501');
 assert.notEqual(await code(call(null,future,plus(future,1),'09:00','11:00')),'ok');
 assert.equal(await code(call(O,future,plus(future,28),'09:00','11:00')),'22023','29 days');
 // Inclusive 28-day maximum keeps the original slots before the trim regression below.
 assert.equal((await call(O,future,plus(future,27),'09:00','12:00'))[0].removed_slots,0,'28 days accepted without trimming');
 assert.equal((await as(O,`select end_date::text from public.wwm_rooms where id=$1`,[room]))[0].end_date,plus(future,27));
 assert.equal(await code(call(O,future,future,'09:15','11:00')),'22023','unaligned');
 assert.equal(await code(call(O,future,future,'11:00','09:00')),'22023','end before start');
 assert.equal(await code(call(O,future,future,'09:00','11:00','Mars/Base')),'22023','timezone');
 assert.equal(await code(call(O,'2020-01-01','2020-01-02','09:00','11:00')),'22023','past start');
 const [r]=await call(O,future,plus(future,1),'09:00','11:00');
 assert.equal(r.removed_slots,1);
 const rows=await as(O,`select user_id,slots from public.wwm_responses where room_id=$1 order by display_name`,[room]);
 assert.deepEqual(rows.map(x=>x.slots.map(s=>new Date(s).toISOString())),[[S(future,'09:00')],[S(future,'10:00')]]);
 const roomRow=(await as(O,`select end_date,end_time from public.wwm_rooms where id=$1`,[room]))[0];
 assert.equal(roomRow.end_time,'11:00:00');
 // all-day window keeps everything
 assert.equal((await call(O,future,plus(future,1),'00:00','24:00'))[0].removed_slots,0);
});
test('delete: owner only; members, responses cascade',async()=>{
 assert.equal(await code(as(Mb,`select public.wwm_delete_room($1)`,[room])),'42501');
 assert.notEqual(await code(as(null,`select public.wwm_delete_room($1)`,[room])),'ok');
 assert.equal((await as(O,`select public.wwm_delete_room($1) d`,[room]))[0].d,true);
 assert.equal((await db.query(`select count(*)::int n from public.wwm_members where room_id=$1`,[room])).rows[0].n,0);
 assert.equal((await db.query(`select count(*)::int n from public.wwm_responses where room_id=$1`,[room])).rows[0].n,0);
 assert.equal((await as(null,`select * from public.wwm_invitation_preview($1,$2)`,[room,token])).length,0);
 assert.equal(await code(as(O,`select public.wwm_delete_room($1)`,[room])),'42501','already gone');
});
}
