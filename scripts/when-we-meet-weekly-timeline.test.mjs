import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSlots, aggregate } from '../src/features/when-we-meet/domain.mjs';
import { projectWeeklyTimeline, projectDraftRow, weekWindow } from '../src/features/when-we-meet/weekly-timeline.mjs';
const room=(startDate,endDate,timezone='UTC',startTime='09:00',endTime='10:00')=>({title:'Test',startDate,endDate,startTime,endTime,timezone});
const response=(userId,displayName,slots)=>({userId,displayName,slots});
test('saved rows and chronological counts are independent of response order, draft, and unknown members',()=>{
  const slots=makeSlots(room('2026-09-01','2026-09-01'));
  const responses=[response('b','Beta',[slots[0].id]),response('a','Alpha',[slots[0].id,slots[1].id])];
  const input={slots,responses,currentUserId:'a'};
  const result=projectWeeklyTimeline(input);
  assert.deepEqual(result.countById, Object.fromEntries(aggregate(slots.map(s=>s.id),responses).map(x=>[x.id,x.count])));
  assert.deepEqual(result.days[0].slots.map(s=>s.count),[2,1]);
  assert.deepEqual(result.rows.map(r=>r.userId),['a','b']);
  assert.equal(result.rows[0].isCurrentUser,true);
  assert.deepEqual(projectWeeklyTimeline({...input,responses:responses.toReversed()}).rows,result.rows);
  assert.equal(result.responseCount,2);
  assert.equal(result.rows.length,2);
  assert.deepEqual(projectDraftRow({slots,selectedIds:[slots[1].id],displayName:'Me'}).runs[0].slotIds,[slots[1].id]);
  assert.deepEqual(result.days[0].slots.map(s=>s.count),[2,1]);
  assert.deepEqual(responses[0].slots,[slots[0].id]);
});
test('empty response set is not interpreted as membership or universal agreement',()=>{
 const slots=makeSlots(room('2026-09-01','2026-09-01'));
 const p=projectWeeklyTimeline({slots,responses:[],currentUserId:'missing'});
 assert.equal(p.responseCount,0); assert.deepEqual(p.rows,[]);
 assert.deepEqual(p.days[0].slots.map(s=>({count:s.count,all:s.all})),[{count:0,all:false},{count:0,all:false}]);
});
test('same names remain distinguishable without ID labels and colors are stable',()=>{
 const slots=makeSlots(room('2026-09-01','2026-09-01'));
 const responses=[response('private-id-1','Sam',[]),response('private-id-2','Sam',[])];
 const rows=projectWeeklyTimeline({slots,responses,currentUserId:'private-id-1'}).rows;
 assert.notEqual(rows[0].label,rows[1].label);
 assert.ok(rows.every(r=>!r.label.includes('private-id')));
 assert.deepEqual(rows,projectWeeklyTimeline({slots,responses:responses.toReversed(),currentUserId:'private-id-1'}).rows);
});
test('duplicate response user IDs are rejected instead of counted twice',()=>{
 const slots=makeSlots(room('2026-09-01','2026-09-01'));
 assert.throws(()=>projectWeeklyTimeline({slots,responses:[response('a','A',[]),response('a','A',[])],currentUserId:'a'}),/duplicate.*user/i);
});
test('week windows use room-start anchored inclusive chunks and retain a selected day only within window',()=>{
 for(const length of [1,7,8,14]){
   const dates=Array.from({length},(_,i)=>new Date(Date.UTC(2026,8,1+i)).toISOString().slice(0,10));
   const first=weekWindow(dates,0,dates.at(-1));
   assert.deepEqual(first.dates,dates.slice(0,7)); assert.equal(first.selectedDay,length>7?dates[0]:dates.at(-1));
   assert.equal(first.weekCount,Math.ceil(length/7));
   const last=weekWindow(dates,999,dates.at(-1));
   assert.deepEqual(last.dates,dates.slice(Math.floor((length-1)/7)*7));
   assert.equal(last.selectedDay,dates.at(-1));
   assert.equal(weekWindow(dates,0,dates[2]).selectedDay,dates[2]??dates[0]);
 }
 assert.deepEqual(weekWindow([],0),{weekIndex:0,weekCount:0,dates:[],selectedDay:null});
});
test('runs merge only adjacent chronological half-hours on the same room date',()=>{
 const slots=makeSlots(room('2026-09-01','2026-09-02','UTC','09:00','10:30'));
 const selected=[slots[0].id,slots[1].id,slots[3].id,slots[4].id];
 const p=projectWeeklyTimeline({slots,responses:[response('a','A',selected)],currentUserId:'a'});
 assert.deepEqual(p.rows[0].runs.map(r=>r.slotIds),[[slots[0].id,slots[1].id],[slots[3].id,slots[4].id]]);
 assert.equal(p.rows[0].runs[0].startUtc,slots[0].id);
 assert.equal(p.rows[0].runs[0].endUtc,new Date(Date.parse(slots[1].id)+1800000).toISOString());
});
test('fall-back repeated wall times remain two distinct UTC slots; spring-forward gaps are not invented',()=>{
 const fall=makeSlots(room('2026-11-01','2026-11-01','America/New_York','01:00','02:00'));
 assert.deepEqual(fall.map(s=>s.time),['01:00','01:30','01:00','01:30']);
 const p=projectWeeklyTimeline({slots:fall,responses:[response('a','A',fall.map(s=>s.id))],currentUserId:'a'});
 assert.equal(p.days[0].slots.length,4);
 assert.equal(new Set(p.days[0].slots.map(s=>s.id)).size,4);
 assert.equal(p.rows[0].runs.length,1);
 assert.deepEqual(p.rows[0].runs[0].slotIds,fall.map(s=>s.id));
 const spring=makeSlots(room('2026-03-08','2026-03-08','America/New_York','01:00','04:00'));
 assert.deepEqual(spring.map(s=>s.time),['01:00','01:30','03:00','03:30']);
 assert.deepEqual(projectWeeklyTimeline({slots:spring,responses:[],currentUserId:''}).days[0].slots.map(s=>s.id),spring.map(s=>s.id));
});
test('rows sort names naturally (Participant 2 before Participant 10)',()=>{
  const slots=makeSlots(room('2026-09-01','2026-09-01'));
  const responses=[11,2,10,1].map(n=>response(`u${n}`,`Participant ${n}`,[slots[0].id]));
  assert.deepEqual(projectWeeklyTimeline({slots,responses,currentUserId:'x'}).rows.map(r=>r.label),['Participant 1','Participant 2','Participant 10','Participant 11']);
});
