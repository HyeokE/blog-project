import test from 'node:test';
import assert from 'node:assert/strict';
import {plural,compactRange,meetingSummary,confirmedLine,confirmedFacts,saveStatus,fillButtonLabel,fillToast,invitationsSentToast,resendQuestion,MEETING_TOASTS} from '../src/features/when-we-meet/meeting-copy.mjs';

test('plural picks the singular only for exactly one',()=>{
 assert.equal(plural(1,'member'),'1 member');
 assert.equal(plural(0,'member'),'0 members');
 assert.equal(plural(2,'saved response'),'2 saved responses');
 assert.equal(plural(1,'person','people'),'1 person');
 assert.equal(plural(3,'person','people'),'3 people');
});

test('compactRange drops the repeated year (and keeps it across a year boundary)',()=>{
 assert.equal(compactRange('2026-10-01','2026-10-14'),'2026.10.01 – 10.14');
 assert.equal(compactRange('2026-12-28','2027-01-03'),'2026.12.28 – 2027.01.03');
 assert.equal(compactRange('2026-10-01','2026-10-01'),'2026.10.01');
 assert.equal(compactRange('',''),'');
});

test('meetingSummary is one line: dates · hours (or All day) · timezone',()=>{
 assert.equal(meetingSummary({startDate:'2026-10-01',endDate:'2026-10-14',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul'}),'2026.10.01 – 10.14 · 09:00–18:00 · Asia/Seoul');
 assert.equal(meetingSummary({startDate:'2026-10-01',endDate:'2026-10-14',startTime:'00:00',endTime:'24:00',timezone:'Asia/Seoul'}),'2026.10.01 – 10.14 · All day · Asia/Seoul');
});

test('confirmedLine shows weekday, date and local time without repeating the timezone',()=>{
 // 01:00Z = 10:00 in Seoul (UTC+9), a Thursday.
 assert.equal(confirmedLine({startsAt:'2026-10-01T01:00:00Z',endsAt:'2026-10-01T01:30:00Z',timezone:'Asia/Seoul'}),'Confirmed · Thu 2026.10.01 · 10:00–10:30');
 // A meeting that ends at local midnight shows 24:00, not 00:00.
 assert.equal(confirmedLine({startsAt:'2026-10-01T14:30:00Z',endsAt:'2026-10-01T15:00:00Z',timezone:'Asia/Seoul'}),'Confirmed · Thu 2026.10.01 · 23:30–24:00');
 assert.equal(confirmedLine(null),'');
});

test('confirmedFacts lays the record out as label/value pairs',()=>{
 assert.deepEqual(confirmedFacts({date:'2026-10-01',start:'10:00',end:'10:30',organizer:'Alex',attendeeNames:['Alex','Morgan']}),[
  {label:'Date',value:'Thu 2026.10.01'},{label:'Time',value:'10:00–10:30'},{label:'Organizer',value:'Alex'},{label:'Attendees',value:'Alex, Morgan'},
 ]);
 assert.deepEqual(confirmedFacts({date:'2026-10-01',start:'10:00',end:'10:30',organizer:'Alex',attendeeNames:[]}).map(row=>row.label),['Date','Time','Organizer']);
});

test('saveStatus is compact: nothing before the first edit, Saving… while in flight, Saved after, error offers retry',()=>{
 assert.deepEqual(saveStatus({state:'saved',dirty:false,edited:false}),{tone:'idle',text:''});
 assert.deepEqual(saveStatus({state:'pending',dirty:true,edited:true}),{tone:'saving',text:'Saving…'});
 assert.deepEqual(saveStatus({state:'saving',dirty:true,edited:true}),{tone:'saving',text:'Saving…'});
 assert.deepEqual(saveStatus({state:'saved',dirty:true,edited:true}),{tone:'saving',text:'Saving…'});
 assert.deepEqual(saveStatus({state:'saved',dirty:false,edited:true}),{tone:'saved',text:'Saved'});
 assert.deepEqual(saveStatus({state:'error',dirty:true,edited:true}),{tone:'error',text:'Couldn’t save'});
});

test('fill copy counts half-hours with correct plurals',()=>{
 assert.equal(fillButtonLabel(669),'Fill 669 slots');
 assert.equal(fillButtonLabel(1),'Fill 1 slot');
 assert.equal(fillToast(12),'Filled 12 half-hours');
 assert.equal(fillToast(1),'Filled 1 half-hour');
});

test('confirmation toasts and the resend question count people',()=>{
 assert.equal(invitationsSentToast(3),'Invitations sent to 3 people');
 assert.equal(invitationsSentToast(1),'Invitations sent to 1 person');
 assert.equal(resendQuestion(2),'Email 2 attendees again?');
 assert.equal(resendQuestion(1),'Email 1 attendee again?');
 assert.equal(resendQuestion(undefined),'Email the attendees again?');
});

test('one toast vocabulary, one sentence each, meeting not room',()=>{
 for(const text of Object.values(MEETING_TOASTS)){
  assert.doesNotMatch(text,/\broom\b/i);
  assert.doesNotMatch(text,/\.\s+\S/,'one sentence');
 }
 assert.equal(MEETING_TOASTS.linkCopied,'Link copied');
 assert.equal(MEETING_TOASTS.copyFailed,'Couldn’t copy — link selected');
 assert.equal(MEETING_TOASTS.renamed,'Meeting renamed');
 assert.equal(MEETING_TOASTS.nameUpdated,'Name updated');
 assert.equal(MEETING_TOASTS.editSaved,'Changes saved · attendees notified');
 assert.equal(MEETING_TOASTS.resent,'Invitations re-sent');
});
