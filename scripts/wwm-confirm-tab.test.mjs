import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {normalizeConfirmationResponse,proposalInstants,confirmationBody,confirmPanelState,confirmFailure,confirmOutcome} from '../src/features/when-we-meet/confirm-tab.mjs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const room=(over={})=>({title:'Team coffee',startDate:'2026-10-01',endDate:'2026-10-02',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul',...over});
const slots=makeSlots(room());
const A='11111111-1111-4111-8111-111111111111',B='33333333-3333-4333-8333-333333333333';
const raw={confirmation:null,review:{calendarConnected:true,organizerEmail:'a@example.test',attendees:[{userId:A,name:'Alex',email:'a@example.test',hasAvailability:true,isOrganizer:true},{userId:B,name:'Morgan',email:null,hasAvailability:false,isOrganizer:false}]}};

test('validates the camelCase API payload; snake_case rows are converted only at the server boundary',()=>{
 const data=normalizeConfirmationResponse({confirmation:{status:'confirmed',title:'T',startsAt:'2026-10-01T01:00:00.000Z',endsAt:'2026-10-01T02:00:00.000Z',timezone:'Asia/Seoul',googleEventUrl:'https://calendar.google.com/x'},review:null});
 assert.deepEqual(data.confirmation,{status:'confirmed',title:'T',startsAt:'2026-10-01T01:00:00.000Z',endsAt:'2026-10-01T02:00:00.000Z',timezone:'Asia/Seoul',googleEventUrl:'https://calendar.google.com/x'});
 assert.equal(data.review,null);
 assert.equal(normalizeConfirmationResponse(raw).review.attendees[1].email,null);
 assert.throws(()=>normalizeConfirmationResponse({confirmation:null,review:{attendees:'x'}}));
 assert.throws(()=>normalizeConfirmationResponse(null));
 assert.throws(()=>normalizeConfirmationResponse({confirmation:{status:'confirmed',title:'T',starts_at:'2026-10-01T01:00:00.000Z',ends_at:'2026-10-01T02:00:00.000Z',timezone:'Asia/Seoul'},review:null}),/Invalid confirmation/);
 const route=readFileSync(new URL('../src/app/api/craft/when-we-meet/[roomId]/confirmation/shared.ts',import.meta.url),'utf8');
 assert.match(route,/return normalizeConfirmation\(data\?\.\[0\]\)/);assert.match(route,/return normalizeAttendees\(data\|\|\[\]\)/);
});

test('the calendar gets room slots and saved responses, not precomputed counts',()=>{
 const tab=read('src/features/when-we-meet/ConfirmTab.tsx');
 assert.doesNotMatch(tab,/aggregateSlotCounts/);
 assert.match(tab,/slots=\{slots\} responses=\{responses\} currentUserId=\{/);
 assert.doesNotMatch(read('src/features/when-we-meet/confirm-tab.mjs'),/export function aggregateSlotCounts/);
});

test('selected slot ids win over ambiguous wall clocks and must match the typed fields',()=>{
 const ny=makeSlots(room({startTime:'00:00',endTime:'24:00',timezone:'America/New_York',startDate:'2026-11-01',endDate:'2026-11-01'}));
 const repeated=ny.filter(s=>s.time==='01:00'||s.time==='01:30').slice(2);
 assert.deepEqual(proposalInstants({date:'2026-11-01',start:'01:00',end:'02:00',startId:repeated[0].id,endId:repeated[1].id},ny),{start:'2026-11-01T06:00:00.000Z',end:'2026-11-01T07:00:00.000Z'});
 assert.deepEqual(proposalInstants({date:'2026-11-01',start:'01:00',end:'02:00'},ny),{start:'2026-11-01T05:00:00.000Z',end:'2026-11-01T07:00:00.000Z'});
 assert.throws(()=>proposalInstants({date:'2026-11-01',start:'01:00',end:'03:00',startId:repeated[0].id,endId:repeated[1].id},ny),/changed/);
 assert.throws(()=>proposalInstants({date:'2026-10-31',start:'01:00',end:'02:00',startId:repeated[0].id,endId:repeated[1].id},ny));
 assert.throws(()=>proposalInstants({date:'2026-11-01',start:'01:00',end:'02:00',startId:repeated[1].id,endId:repeated[0].id},ny));
});

test('proposal converts room-local wall clock to UTC instants via slot ids',()=>{
 assert.deepEqual(proposalInstants({date:'2026-10-01',start:'10:00',end:'11:30'},slots),{start:'2026-10-01T01:00:00.000Z',end:'2026-10-01T02:30:00.000Z'});
 assert.throws(()=>proposalInstants({date:'2026-10-01',start:'08:00',end:'09:00'},slots));
 assert.throws(()=>proposalInstants({date:'2026-10-01',start:'11:00',end:'11:00'},slots));
 assert.throws(()=>proposalInstants({date:'2026-10-05',start:'10:00',end:'11:00'},slots));
});

test('24:00 rooms end at the next local midnight',()=>{
 const all=makeSlots(room({startTime:'00:00',endTime:'24:00'}));
 assert.deepEqual(proposalInstants({date:'2026-10-01',start:'23:00',end:'24:00'},all),{start:'2026-10-01T14:00:00.000Z',end:'2026-10-01T15:00:00.000Z'});
 const ny=makeSlots(room({startTime:'00:00',endTime:'24:00',timezone:'America/New_York',startDate:'2026-11-01',endDate:'2026-11-01'}));
 // DST fall-back day: 01:00 repeats; the start uses the first occurrence and the end is the true next-day midnight.
 assert.deepEqual(proposalInstants({date:'2026-11-01',start:'00:00',end:'24:00'},ny),{start:'2026-11-01T04:00:00.000Z',end:'2026-11-02T05:00:00.000Z'});
});

test('request body partitions every attendee into recipients and excluded',()=>{
 const body=confirmationBody({title:'Team coffee',proposal:{date:'2026-10-01',start:'10:00',end:'11:00',recipientIds:[A],excludedIds:[B]},slots,attendeeIds:[A,B]});
 assert.deepEqual(body,{title:'Team coffee',date:'2026-10-01',start:'2026-10-01T01:00:00.000Z',end:'2026-10-01T02:00:00.000Z',recipients:[A],excluded:[B],optional:[]});
 assert.match(body.start,/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
 assert.throws(()=>confirmationBody({title:'T',proposal:{date:'2026-10-01',start:'10:00',end:'11:00',recipientIds:[A],excludedIds:[]},slots,attendeeIds:[A,B]}));
 assert.throws(()=>confirmationBody({title:'T',proposal:{date:'2026-10-01',start:'10:00',end:'11:00',recipientIds:[A,B],excludedIds:[B]},slots,attendeeIds:[A,B]}));
});

test('owner panel state maps review attendees, organizer email and calendar connection',()=>{
 const state=confirmPanelState({data:normalizeConfirmationResponse(raw),slots});
 assert.equal(state.role,'owner');assert.equal(state.calendar,'connected');assert.equal(state.status,'draft');
 assert.equal(state.organizerEmail,'a@example.test');
 assert.deepEqual(state.members,[{id:A,name:'Alex',email:'a@example.test',response:'available'},{id:B,name:'Morgan',response:'not-responded'}]);
 const off=confirmPanelState({data:normalizeConfirmationResponse({...raw,review:{...raw.review,calendarConnected:false,organizerEmail:null}}),slots});
 assert.equal(off.calendar,'disconnected');assert.equal(off.organizerEmail,undefined);
});

test('member sees no review; confirmed record is formatted in the room timezone',()=>{
 const confirmation={status:'confirmed',title:'T',startsAt:'2026-10-01T01:00:00.000Z',endsAt:'2026-10-01T02:30:00.000Z',timezone:'Asia/Seoul',googleEventUrl:null};
 const member=confirmPanelState({data:normalizeConfirmationResponse({confirmation,review:null}),slots,organizerName:'Alex'});
 assert.equal(member.role,'member');assert.equal(member.status,'confirmed');assert.deepEqual(member.members,[]);
 assert.deepEqual(member.confirmation,{title:'T',date:'2026-10-01',start:'10:00',end:'11:30',timezone:'Asia/Seoul',organizer:'Alex',attendeeNames:[],attendees:[],rsvp:false,isRecipient:null});
 const owner=confirmPanelState({data:normalizeConfirmationResponse({...raw,confirmation:{...confirmation,googleEventUrl:'https://calendar.google.com/e'}}),slots});
 assert.equal(owner.confirmation.organizer,'Alex');assert.deepEqual(owner.confirmation.attendeeNames,['Alex','Morgan']);assert.equal(owner.confirmation.eventUrl,'https://calendar.google.com/e');
 const known=confirmPanelState({data:normalizeConfirmationResponse({...raw,confirmation}),slots,recipientIds:[A]});
 assert.deepEqual(known.confirmation.attendeeNames,['Alex']);
 const midnight=confirmPanelState({data:normalizeConfirmationResponse({confirmation:{...confirmation,startsAt:'2026-10-01T14:00:00.000Z',endsAt:'2026-10-01T15:00:00.000Z'},review:null}),slots:makeSlots(room({startTime:'00:00',endTime:'24:00'}))});
 assert.equal(midnight.confirmation.end,'24:00');
});

test('pending/reconciling records show the checking state; failed records invite a new review',()=>{
 const base={title:'T',startsAt:'2026-10-01T01:00:00.000Z',endsAt:'2026-10-01T02:00:00.000Z',timezone:'Asia/Seoul',googleEventUrl:null};
 for(const status of ['pending','reconciling'])assert.equal(confirmPanelState({data:normalizeConfirmationResponse({confirmation:{...base,status},review:null}),slots}).status,'reconciling');
 const failed=confirmPanelState({data:normalizeConfirmationResponse({...raw,confirmation:{...base,status:'failed'}}),slots});
 assert.equal(failed.status,'failed');assert.match(failed.error,/Review/);
});

test('POST outcomes and failures map to panel status without losing the proposal',()=>{
 assert.equal(confirmOutcome({status:'confirmed',url:'u',confirmation:null}).status,'confirmed');
 assert.equal(confirmOutcome({status:'reconciling',confirmation:null}).status,'reconciling');
 assert.deepEqual(confirmFailure({status:409,reconnect:true,message:'Connect Google Calendar to send invitations.'}),{status:'failed',calendar:'disconnected',error:'Connect Google Calendar to send invitations. Connecting does not send anything; review again afterward.',retrySame:false});
 const stale=confirmFailure({status:400,reconnect:false,message:'The proposed time or recipients changed. Review again.'});
 assert.equal(stale.retrySame,false);assert.match(stale.error,/Review again/);
 const google=confirmFailure({status:502,reconnect:false,message:'Google Calendar rejected the invitation. Nothing was sent.'});
 assert.equal(google.retrySame,true);assert.match(google.error,/Nothing was sent/);
 assert.equal(confirmFailure({status:409,reconnect:false,message:'This meeting was already confirmed with different details.'}).retrySame,false);
 assert.equal(confirmFailure(new TypeError('Failed to fetch')).retrySame,true);
});

test('Confirm tab is a fourth shadcn tab wired to the panel and existing tabs stay intact',()=>{
 const room=read('src/features/when-we-meet/WhenWeMeet.tsx');
 assert.match(room,/const tabNames=\{availability:'Availability',everyone:'Everyone',people:'People',confirm:'Confirm'\} as const/);
 assert.match(room,/view==='confirm'\?<ConfirmTab [^>]*\/>:view==='people'\?<PeoplePanel /);
 const tab=read('src/features/when-we-meet/ConfirmTab.tsx');
 assert.match(tab,/loadConfirmation\(roomId/);assert.match(tab,/postConfirmation\(roomId/);assert.match(tab,/AbortController/);
 assert.match(tab,/connectGoogleCalendar\(/);
 assert.match(tab,/<ConfirmationPanel\s/);
});
test('the review can rename the event and mark recipients optional',()=>{
 const body=confirmationBody({title:'Team coffee',proposal:{date:'2026-10-01',start:'10:00',end:'11:00',recipientIds:[A,B],excludedIds:[],title:'  Kickoff lunch ',optionalIds:[B]},slots,attendeeIds:[A,B]});
 assert.equal(body.title,'Kickoff lunch');
 assert.deepEqual(body.optional,[B]);
 const plain=confirmationBody({title:'Team coffee',proposal:{date:'2026-10-01',start:'10:00',end:'11:00',recipientIds:[A,B],excludedIds:[]},slots,attendeeIds:[A,B]});
 assert.equal(plain.title,'Team coffee');assert.deepEqual(plain.optional,[]);
 // An excluded member cannot also be optional; an empty name is rejected before the request.
 assert.deepEqual(confirmationBody({title:'T',proposal:{date:'2026-10-01',start:'10:00',end:'11:00',recipientIds:[A],excludedIds:[B],optionalIds:[B]},slots,attendeeIds:[A,B]}).optional,[]);
 assert.throws(()=>confirmationBody({title:'T',proposal:{date:'2026-10-01',start:'10:00',end:'11:00',recipientIds:[A,B],excludedIds:[],title:'   '},slots,attendeeIds:[A,B]}));
});
test('a confirmed record shows the event name that was sent',()=>{
 const state=confirmPanelState({data:{confirmation:{status:'confirmed',title:'Kickoff lunch',startsAt:'2026-10-01T01:00:00.000Z',endsAt:'2026-10-01T02:00:00.000Z',timezone:'Asia/Seoul',googleEventUrl:null},review:null},slots,organizerName:'Org'});
 assert.equal(state.confirmation.title,'Kickoff lunch');
});
