import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmMeeting,eventMatches} from '../src/features/when-we-meet/confirmation-flow.mjs';
import {GoogleCalendarError} from '../src/features/when-we-meet/calendar-google.mjs';

const valid={roomId:'r',start:'2026-10-01T01:00:00.000Z',end:'2026-10-01T02:00:00.000Z',timezone:'Asia/Seoul',title:'Sync',revision:1,recipients:[{userId:'a',email:'A@x.com'},{userId:'b',email:'b@x.com'}],excluded:[]};
const event={id:'evt',status:'confirmed',htmlLink:'https://www.google.com/calendar/event?eid=1',start:{dateTime:'2026-10-01T10:00:00+09:00'},end:{dateTime:'2026-10-01T11:00:00+09:00'},attendees:[{email:'a@x.com'},{email:'b@x.com'},{email:'owner@x.com',organizer:true}]};

function deps(overrides={}){
 const calls=[];
 const d={calls,
  reserve:async()=>{calls.push('reserve');return 'reserved_reconcile_required';},
  getEvent:async()=>{calls.push('get');return null;},
  insertEvent:async body=>{calls.push(['insert',body.id]);return event;},
  finalize:async(status,url)=>{calls.push(['finalize',status,url??null]);return status;},
  ...overrides};
 return d;
}

test('a new confirmation reserves, inserts with the deterministic ID, reads back and finalizes',async()=>{
 const d=deps({getEvent:(()=>{let n=0;return async()=>{d.calls.push('get');return n++?event:null;};})()});
 const result=await confirmMeeting({valid,eventId:'evt',...d});
 assert.deepEqual(result,{status:'confirmed',url:event.htmlLink});
 assert.deepEqual(d.calls,['reserve','get',['insert','evt'],'get',['finalize','confirmed',event.htmlLink]]);
});

test('retries reconcile an event Google already created instead of inserting again',async()=>{
 const d=deps({reserve:async()=>'reconcile',getEvent:async()=>event});
 const result=await confirmMeeting({valid,eventId:'evt',...d});
 assert.equal(result.status,'confirmed');
 assert.ok(!d.calls.some(c=>Array.isArray(c)&&c[0]==='insert'));
});

test('a duplicate-ID insert (409) is treated as already created and read back',async()=>{
 let gets=0;
 const d=deps({getEvent:async()=>gets++?event:null,insertEvent:async()=>{throw new GoogleCalendarError('dup',{status:409,definite:true});}});
 assert.equal((await confirmMeeting({valid,eventId:'evt',...d})).status,'confirmed');
});

test('a definite rejection releases the claim so the owner can try again',async()=>{
 const d=deps({insertEvent:async()=>{throw new GoogleCalendarError('bad',{status:400,definite:true});}});
 const result=await confirmMeeting({valid,eventId:'evt',...d});
 assert.equal(result.status,'failed');
 assert.deepEqual(d.calls.at(-1),['finalize','released',null]);
});

test('an ambiguous failure keeps the claim reconciling and never blindly resends',async()=>{
 const d=deps({insertEvent:async()=>{throw new GoogleCalendarError('timeout',{definite:false});}});
 const result=await confirmMeeting({valid,eventId:'evt',...d});
 assert.equal(result.status,'reconciling');
 assert.deepEqual(d.calls.at(-1),['finalize','reconciling',null]);
});

test('conflicting or already confirmed claims never call Google',async()=>{
 for(const claim of ['conflict','existing']){
  const d=deps({reserve:async()=>{d.calls.push('reserve');return claim;}});
  const result=await confirmMeeting({valid,eventId:'evt',...d});
  assert.equal(result.status,claim==='conflict'?'conflict':'confirmed');
  assert.deepEqual(d.calls,['reserve']);
 }
});

test('a read-back that does not match the proposal is not finalized as confirmed',async()=>{
 const wrong={...event,end:{dateTime:'2026-10-01T12:00:00+09:00'}};
 const d=deps({reserve:async()=>'reconcile',getEvent:async()=>wrong});
 const result=await confirmMeeting({valid,eventId:'evt',...d});
 assert.equal(result.status,'reconciling');
 assert.ok(!d.calls.some(c=>Array.isArray(c)&&c[1]==='confirmed'));
});

test('eventMatches compares instants and attendee addresses case-insensitively, ignoring the organizer',()=>{
 assert.equal(eventMatches(event,valid),true);
 assert.equal(eventMatches({...event,status:'cancelled'},valid),false);
 assert.equal(eventMatches({...event,attendees:[{email:'a@x.com'}]},valid),false);
});
