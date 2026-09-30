import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {scheduleErrors,scheduleImpact,scheduleChanged} from '../src/features/when-we-meet/room-schedule.mjs';
import {scheduleWarning,deleteMeetingCopy} from '../src/features/when-we-meet/meeting-copy.mjs';

const room={title:'T',startDate:'2026-10-05',endDate:'2026-10-07',startTime:'09:00',endTime:'12:00',timezone:'Asia/Seoul'};
const slots=makeSlots(room);
const at=(date,time)=>slots.find(slot=>slot.date===date&&slot.time===time).id;
const now=new Date('2026-10-01T00:00:00Z');

test('schedule validation matches creation: dates, 28-day cap, 30-minute times, timezone',()=>{
 assert.deepEqual(scheduleErrors(room,{previousStart:room.startDate},now),{});
 assert.equal(scheduleErrors({...room,startDate:'',endDate:''},{previousStart:room.startDate},now).dates,'Choose a start and end date.');
 assert.equal(scheduleErrors({...room,endDate:'2026-11-02'},{previousStart:room.startDate},now).dates,'Choose at most 28 inclusive days.');
 assert.equal(scheduleErrors({...room,startTime:'12:00',endTime:'09:00'},{previousStart:room.startDate},now).times,'End time must be later than start time.');
 assert.equal(scheduleErrors({...room,timezone:'Mars/Base'},{previousStart:room.startDate},now).timezone,'Choose a valid timezone.');
});
test('a past start is rejected unless it is the meeting’s existing start',()=>{
 const past={...room,startDate:'2026-09-28',endDate:'2026-10-02'};
 assert.equal(scheduleErrors(past,{previousStart:room.startDate},now).dates,'Choose dates that are not in the past.');
 assert.deepEqual(scheduleErrors(past,{previousStart:'2026-09-28'},now),{});
});
test('scheduleChanged ignores the title and compares only the window',()=>{
 assert.equal(scheduleChanged(room,{...room,title:'Other'}),false);
 assert.equal(scheduleChanged(room,{...room,endTime:'11:00'}),true);
 assert.equal(scheduleChanged(room,{...room,timezone:'UTC'}),true);
});
test('impact counts saved half-hours that fall outside the new window, per person',()=>{
 const responses=[{userId:'a',displayName:'Alex',slots:[at('2026-10-05','09:00'),at('2026-10-07','11:30')]},{userId:'m',displayName:'Morgan',slots:[at('2026-10-06','10:00')]},{userId:'t',displayName:'Taylor',slots:[]}];
 const impact=scheduleImpact(responses,{...room,endDate:'2026-10-06',endTime:'11:00'});
 assert.equal(impact.removedSlots,1);
 assert.deepEqual(impact.people,['Alex']);
 assert.deepEqual(scheduleImpact(responses,room),{removedSlots:0,people:[]});
 assert.deepEqual(scheduleImpact(responses,{...room,timezone:'UTC'}).people,['Alex','Morgan']);
});
test('warning and delete copy',()=>{
 assert.equal(scheduleWarning({removedSlots:0,people:[]},false),'');
 assert.equal(scheduleWarning({removedSlots:3,people:['Alex','Morgan']},false),'3 saved half-hours from Alex, Morgan fall outside the new times and will be removed.');
 assert.equal(scheduleWarning({removedSlots:1,people:['Alex']},true),'1 saved half-hour from Alex falls outside the new times and will be removed. The confirmed time and its invitations stay as they are.');
 assert.equal(scheduleWarning({removedSlots:0,people:[]},true),'The confirmed time and its invitations stay as they are.');
 assert.equal(deleteMeetingCopy('Team coffee',false).title,'Delete Team coffee?');
 assert.equal(deleteMeetingCopy('Team coffee',false).description,'Everyone loses access to this meeting and its saved availability. This can’t be undone.');
 assert.match(deleteMeetingCopy('Team coffee',true).description,/The Google Calendar event isn’t cancelled/);
});

test('28-day limit is one constant shared by the app, the API and the database',async()=>{
 const {readFileSync}=await import('node:fs');
 const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 const {MAX_RANGE_DAYS,MAX_RESPONSE_SLOTS}=await import('../src/features/when-we-meet/limits.mjs');
 assert.equal(MAX_RANGE_DAYS,28);assert.equal(MAX_RESPONSE_SLOTS,1344);
 const sql=read('supabase/migrations/20261001030000_wwm_four_week_range.sql');
 assert.match(sql,/end_date < start_date \+ 28/);assert.match(sql,/cardinality\(slots\) <= 1344/);assert.match(sql,/p_end_date>=p_start_date\+28/);
 const route=read('src/app/api/craft/when-we-meet/[roomId]/route.ts');
 assert.match(route,/value\.length<=MAX_RESPONSE_SLOTS/);assert.match(route,/body\(request,128\*1024\)/);
});
