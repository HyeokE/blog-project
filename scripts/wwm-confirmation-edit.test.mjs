import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {patchEvent,GoogleCalendarError} from '../src/features/when-we-meet/calendar-google.mjs';
import {updateConfirmedMeeting,resendInvitations,eventMatchesSnapshot,buildCalendarPatch} from '../src/features/when-we-meet/confirmation-flow.mjs';

const json=(status,body)=>({ok:status>=200&&status<300,status,json:async()=>body});
const valid={roomId:'r',start:'2026-10-01T02:00:00.000Z',end:'2026-10-01T03:00:00.000Z',timezone:'Asia/Seoul',title:'Sync v2',revision:2,recipients:[{userId:'a',email:'A@x.com',optional:false},{userId:'b',email:'b@x.com',optional:true}],excluded:[]};
const before={id:'evt',status:'confirmed',sequence:3,etag:'"e1"',summary:'Sync',htmlLink:'https://www.google.com/calendar/event?eid=1',organizer:{email:'owner@x.com'},start:{dateTime:'2026-10-01T10:00:00+09:00'},end:{dateTime:'2026-10-01T10:30:00+09:00'},attendees:[{email:'owner@x.com',organizer:true,self:true,responseStatus:'accepted'},{email:'a@x.com',responseStatus:'accepted'},{email:'c@x.com',responseStatus:'needsAction'}]};
const after={...before,summary:'Sync v2',start:{dateTime:'2026-10-01T11:00:00+09:00'},end:{dateTime:'2026-10-01T12:00:00+09:00'},attendees:[before.attendees[0],{email:'a@x.com',responseStatus:'accepted'},{email:'b@x.com',optional:true}]};

function deps(overrides={}){
 const calls=[];
 return {calls,
  reserve:async()=>{calls.push('reserve');return 'reserved_reconcile_required';},
  getEvent:(()=>{let n=0;return async()=>{calls.push('get');return n++?after:before;};})(),
  patchEvent:async(id,body)=>{calls.push(['patch',id,body]);return after;},
  finalize:async(status,url)=>{calls.push(['finalize',status,url??null]);return status;},
  ...overrides};
}

test('patchEvent patches the same event with sendUpdates=all; 4xx definite, 5xx/timeouts ambiguous',async()=>{
 let seen;
 await patchEvent('access','abcde',{summary:'x'},async(url,init)=>{seen={url,init};return json(200,{id:'abcde'});},{etag:'"e1"'});
 assert.match(seen.url,/calendars\/primary\/events\/abcde\?sendUpdates=all$/);
 assert.equal(seen.init.method,'PATCH');
 assert.equal(seen.init.headers['If-Match'],'"e1"');
 assert.deepEqual(JSON.parse(seen.init.body),{summary:'x'});
 await patchEvent('access','abcde',{},async(_url,init)=>{assert.equal(init.headers['If-Match'],undefined);return json(200,{});});
 await assert.rejects(patchEvent('access','abcde',{},async()=>json(400,{})),e=>e instanceof GoogleCalendarError&&e.definite===true&&e.status===400);
 await assert.rejects(patchEvent('access','abcde',{},async()=>json(412,{})),e=>e.definite===true);
 await assert.rejects(patchEvent('access','abcde',{},async()=>json(503,{})),e=>e.definite===false);
 await assert.rejects(patchEvent('access','abcde',{},async()=>{throw new Error('timeout');}),e=>e.definite===false);
});

test('the edit patch rewrites time, title and attendees, keeping the organizer and existing RSVPs',()=>{
 const body=buildCalendarPatch(before,valid);
 assert.equal(body.summary,'Sync v2');
 assert.deepEqual(body.start,{dateTime:valid.start,timeZone:'Asia/Seoul'});
 assert.deepEqual(body.end,{dateTime:valid.end,timeZone:'Asia/Seoul'});
 assert.deepEqual(body.attendees,[{email:'owner@x.com',organizer:true,self:true,responseStatus:'accepted'},{email:'a@x.com',responseStatus:'accepted'},{email:'b@x.com',optional:true}]);
 assert.equal(body.attendees.some(a=>a.email==='c@x.com'),false,'removed recipients are dropped (Google notifies them)');
 assert.equal(body.id,undefined);
});

test('eventMatchesSnapshot also compares the title and optional flags',()=>{
 assert.equal(eventMatchesSnapshot(after,valid),true);
 assert.equal(eventMatchesSnapshot({...after,summary:'Sync'},valid),false);
 assert.equal(eventMatchesSnapshot({...after,attendees:[{email:'a@x.com'},{email:'b@x.com'}]},valid),false);
 assert.equal(eventMatchesSnapshot(before,valid),false);
 assert.equal(eventMatchesSnapshot(null,valid),false);
});

test('an edit reserves, reads the event, patches once, reads back and confirms',async()=>{
 const d=deps();
 const result=await updateConfirmedMeeting({valid,eventId:'evt',...d});
 assert.deepEqual(result,{status:'confirmed',url:after.htmlLink});
 assert.deepEqual(d.calls.map(c=>Array.isArray(c)?c[0]==='finalize'?c.slice(0,2).join(':'):c[0]+':'+c[1]:c),['reserve','get','patch:evt','get','finalize:confirmed']);
});

test('a retried edit that Google already applied confirms without patching again',async()=>{
 const d=deps({reserve:async()=>'reconcile',getEvent:async()=>after});
 const result=await updateConfirmedMeeting({valid,eventId:'evt',...d});
 assert.equal(result.status,'confirmed');
 assert.equal(d.calls.some(c=>Array.isArray(c)&&c[0]==='patch'),false);
});

test('an already applied or conflicting edit claim never calls Google',async()=>{
 for(const [claim,status] of [['existing','confirmed'],['conflict','conflict'],['not_confirmed','not_confirmed']]){
  const d=deps({reserve:async()=>claim});
  const result=await updateConfirmedMeeting({valid,eventId:'evt',...d});
  assert.equal(result.status,status);
  assert.deepEqual(d.calls,[]);
 }
});

test('a definite Google rejection reverts to the previously confirmed meeting',async()=>{
 const d=deps({patchEvent:async()=>{throw new GoogleCalendarError('bad',{status:400,definite:true});}});
 const result=await updateConfirmedMeeting({valid,eventId:'evt',...d});
 assert.equal(result.status,'failed');
 assert.deepEqual(d.calls.at(-1),['finalize','reverted',null]);
});

test('a missing Google event reverts instead of recreating it',async()=>{
 const d=deps({getEvent:async()=>null});
 const result=await updateConfirmedMeeting({valid,eventId:'evt',...d});
 assert.equal(result.status,'failed');
 assert.equal(d.calls.some(c=>Array.isArray(c)&&c[0]==='patch'),false);
 assert.deepEqual(d.calls.at(-1),['finalize','reverted',null]);
});

test('ambiguous failures stay reconciling; a read-back mismatch is never confirmed',async()=>{
 const timeout=deps({patchEvent:async()=>{throw new GoogleCalendarError('timeout',{definite:false});}});
 assert.equal((await updateConfirmedMeeting({valid,eventId:'evt',...timeout})).status,'reconciling');
 assert.deepEqual(timeout.calls.at(-1),['finalize','reconciling',null]);
 const unread=deps({getEvent:async()=>{throw new GoogleCalendarError('5xx',{definite:false});}});
 assert.equal((await updateConfirmedMeeting({valid,eventId:'evt',...unread})).status,'reconciling');
 const stale=deps({getEvent:async()=>before});
 assert.equal((await updateConfirmedMeeting({valid,eventId:'evt',...stale})).status,'reconciling');
 assert.ok(!stale.calls.some(c=>Array.isArray(c)&&c[1]==='confirmed'));
});

function resendDeps(overrides={}){
 const calls=[];
 return {calls,
  reserve:async()=>{calls.push('reserve');return 'reserved';},
  getEvent:async()=>{calls.push('get');return before;},
  patchEvent:async(id,body,etag)=>{calls.push(['patch',id,body,etag]);return {...before,sequence:4};},
  finalize:async status=>{calls.push(['finalize',status]);return status;},
  ...overrides};
}

test('resend bumps the iCalendar sequence on the same event (sendUpdates=all) and records it',async()=>{
 const d=resendDeps();
 assert.deepEqual(await resendInvitations({eventId:'evt',...d}),{status:'sent'});
 assert.deepEqual(d.calls,['reserve','get',['patch','evt',{sequence:4},'"e1"'],['finalize','sent']]);
});

test('resend is rate limited, refuses without a confirmed event, and lifts the limit only on definite failure',async()=>{
 for(const claim of ['too_soon','not_confirmed']){
  const d=resendDeps({reserve:async()=>claim});
  assert.equal((await resendInvitations({eventId:'evt',...d})).status,claim);
  assert.equal(d.calls.length,0);
 }
 const rejected=resendDeps({patchEvent:async()=>{throw new GoogleCalendarError('bad',{status:403,definite:true});}});
 assert.equal((await resendInvitations({eventId:'evt',...rejected})).status,'failed');
 assert.deepEqual(rejected.calls.at(-1),['finalize','failed']);
 const missing=resendDeps({getEvent:async()=>null});
 assert.equal((await resendInvitations({eventId:'evt',...missing})).status,'failed');
 const unknown=resendDeps({patchEvent:async()=>{throw new GoogleCalendarError('timeout',{definite:false});}});
 assert.equal((await resendInvitations({eventId:'evt',...unknown})).status,'unknown');
 assert.ok(!unknown.calls.some(c=>Array.isArray(c)&&c[0]==='finalize'),'an unknown outcome keeps the one-minute reservation');
});

const sql=()=>readFileSync(new URL('../supabase/migrations/20261001000000_wwm_confirmation_revisions.sql',import.meta.url),'utf8');
test('revision migration: relaxed revision check, private history, owner RPCs, runtime-only finalizers',()=>{
 const s=sql();
 assert.match(s,/check \(revision >= 1\)/);
 assert.match(s,/create table if not exists public\.wwm_confirmation_revisions/);
 assert.match(s,/revoke all on public\.wwm_confirmation_revisions from public,anon,authenticated/);
 assert.match(s,/wwm_confirmation_revisions enable row level security/);
 assert.match(s,/where status in \('pending','reconciling'\)/,'at most one open edit per room');
 for(const fn of ['wwm_reserve_confirmation_update','wwm_confirmation_owner_detail','wwm_reserve_resend','wwm_rename_room']){
  assert.match(s,new RegExp(`create or replace function public\\.${fn}\\([\\s\\S]*?security definer set search_path = ''`));
  assert.match(s,new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public,anon;`));
  assert.match(s,new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to authenticated;`));
 }
 assert.equal((s.match(/owner_id\s*(?:=|<>)\s*auth\.uid\(\)/g)||[]).length>=4,true);
 assert.match(s,/grant execute on function wwm_calendar_private\.finalize_confirmation_update\([^)]*\),\s*wwm_calendar_private\.finalize_resend\([^)]*\) to wwm_calendar_runtime;/);
 assert.doesNotMatch(s,/grant [^;]*wwm_calendar_private[^;]* to (?:authenticated|anon)/);
 assert.doesNotMatch(s,/grant\s+(?:select|insert|update|delete|all)\s+on\s+(?:table\s+)?public\.wwm_confirmation/i);
 assert.match(s,/revoke all on function wwm_private\.confirmation_claim\([^)]*\) from public,anon,authenticated;/);
 assert.match(s,/interval '1 minute'/);
 assert.match(s,/char_length\(t\) not between 1 and 100/);
});
