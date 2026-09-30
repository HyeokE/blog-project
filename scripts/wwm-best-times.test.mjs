import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {bestTimes} from '../src/features/when-we-meet/best-times.mjs';
import {bestTimeLine} from '../src/features/when-we-meet/meeting-copy.mjs';

const room={title:'T',startDate:'2026-10-01',endDate:'2026-10-02',startTime:'09:00',endTime:'12:00',timezone:'Asia/Seoul'};
const slots=makeSlots(room);
const ids=(date,from,to)=>slots.filter(slot=>slot.date===date&&slot.time>=from&&slot.time<to).map(slot=>slot.id);
const members=[{id:'a',name:'Alex'},{id:'m',name:'Morgan'},{id:'t',name:'Taylor'}];

test('ranks windows by how many members are available; ties go to the earlier window',()=>{
 const responses=[
  {userId:'a',slots:[...ids('2026-10-01','09:00','10:00'),...ids('2026-10-02','10:00','11:00')]},
  {userId:'m',slots:[...ids('2026-10-02','10:00','11:00'),...ids('2026-10-01','11:00','12:00')]},
  {userId:'t',slots:[...ids('2026-10-01','11:00','12:00')]},
 ];
 const result=bestTimes({slots,responses,members});
 assert.equal(result.length,3);
 // 10-02 10:00–11:00 has Alex+Morgan (2); 10-01 11:00–12:00 has Morgan+Taylor (2) and is earlier.
 assert.deepEqual(result.map(w=>[w.date,w.start,w.end,w.count]),[['2026-10-01','11:00','12:00',2],['2026-10-02','10:00','11:00',2],['2026-10-01','09:00','10:00',1]]);
 assert.deepEqual(result[0].missing,['Alex']);
 assert.equal(result[0].total,3);
 assert.equal(result[0].startId,ids('2026-10-01','11:00','12:00')[0]);
 assert.equal(result[0].endId,ids('2026-10-01','11:00','12:00').at(-1));
});

test('only members count; responses from non-members and unknown slot ids are ignored',()=>{
 const responses=[{userId:'x',slots:ids('2026-10-01','09:00','12:00')},{userId:'a',slots:[...ids('2026-10-01','09:00','09:30'),'2020-01-01T00:00:00.000Z']}];
 const result=bestTimes({slots,responses,members});
 assert.deepEqual(result.map(w=>[w.date,w.start,w.end,w.count]),[['2026-10-01','09:00','09:30',1]]);
});

test('no saved overlap → no suggestions',()=>{
 assert.deepEqual(bestTimes({slots,responses:[],members}),[]);
 assert.deepEqual(bestTimes({slots,responses:[{userId:'a',slots:[]}],members}),[]);
});

test('a window never crosses a day and is capped (default 2 hours) from its start',()=>{
 const responses=[{userId:'a',slots:ids('2026-10-01','09:00','12:00')}];
 const [first]=bestTimes({slots,responses,members});
 assert.deepEqual([first.date,first.start,first.end],['2026-10-01','09:00','11:00']);
 const [short]=bestTimes({slots,responses,members,maxSlots:1});
 assert.deepEqual([short.start,short.end],['09:00','09:30']);
});

test('a gap in the slot sequence splits a window (room bounds are honoured)',()=>{
 const narrow=makeSlots({...room,startTime:'09:00',endTime:'10:00'});
 const responses=[{userId:'a',slots:narrow.map(slot=>slot.id)}];
 const result=bestTimes({slots:narrow,responses,members});
 assert.deepEqual(result.map(w=>[w.date,w.start,w.end]),[['2026-10-01','09:00','10:00'],['2026-10-02','09:00','10:00']]);
});

test('minSlots drops windows shorter than the minimum (default 1 half-hour = 30 min)',()=>{
 const responses=[{userId:'a',slots:ids('2026-10-01','09:00','09:30')},{userId:'m',slots:ids('2026-10-02','09:00','10:00')}];
 assert.equal(bestTimes({slots,responses,members}).length,2);
 assert.deepEqual(bestTimes({slots,responses,members,minSlots:2}).map(w=>w.date),['2026-10-02']);
});

test('the line reads count/total available and who is missing',()=>{
 assert.equal(bestTimeLine({count:4,total:5,missing:['Taylor']}),'4/5 available, unavailable: 1');
 assert.equal(bestTimeLine({count:3,total:3,missing:[]}),'3/3 available, unavailable: 0');
 assert.equal(bestTimeLine({count:1,total:4,missing:['A','B','C']}),'1/4 available, unavailable: 3');
});
