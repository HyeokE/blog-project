import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {calendarRows} from '../src/features/when-we-meet/calendar-rows.mjs';
import {gridMove,initialFocusId,scrollTargetRow,pagerWindow,pagerStartFor,cellPosition} from '../src/features/when-we-meet/grid-navigation.mjs';

const room={title:'T',startDate:'2026-09-29',endDate:'2026-10-01',startTime:'00:00',endTime:'24:00',timezone:'Asia/Seoul'};
const slots=makeSlots(room);
const dates=['2026-09-29','2026-09-30','2026-10-01'];
const rows=calendarRows(dates,slots);
const at=(date,time)=>slots.find(slot=>slot.date===date&&slot.time===time).id;

test('arrow keys move one half-hour or one day and stop at the edges',()=>{
 const from=at('2026-09-30','06:00');
 assert.equal(gridMove(rows,dates,from,'ArrowDown'),at('2026-09-30','06:30'));
 assert.equal(gridMove(rows,dates,from,'ArrowUp'),at('2026-09-30','05:30'));
 assert.equal(gridMove(rows,dates,from,'ArrowRight'),at('2026-10-01','06:00'));
 assert.equal(gridMove(rows,dates,from,'ArrowLeft'),at('2026-09-29','06:00'));
 assert.equal(gridMove(rows,dates,at('2026-09-29','00:00'),'ArrowUp'),at('2026-09-29','00:00'));
 assert.equal(gridMove(rows,dates,at('2026-09-29','00:00'),'ArrowLeft'),at('2026-09-29','00:00'));
 assert.equal(gridMove(rows,dates,at('2026-10-01','23:30'),'ArrowRight'),at('2026-10-01','23:30'));
 assert.equal(gridMove(rows,dates,at('2026-10-01','23:30'),'ArrowDown'),at('2026-10-01','23:30'));
});
test('Home/End go to the first/last half-hour of the day; Ctrl+Home/End to the first/last cell',()=>{
 const from=at('2026-09-30','06:00');
 assert.equal(gridMove(rows,dates,from,'Home'),at('2026-09-30','00:00'));
 assert.equal(gridMove(rows,dates,from,'End'),at('2026-09-30','23:30'));
 assert.equal(gridMove(rows,dates,from,'Home',{ctrl:true}),at('2026-09-29','00:00'));
 assert.equal(gridMove(rows,dates,from,'End',{ctrl:true}),at('2026-10-01','23:30'));
});
test('PageUp/PageDown move four hours (APG: author-determined rows) and clamp',()=>{
 const from=at('2026-09-30','06:00');
 assert.equal(gridMove(rows,dates,from,'PageDown'),at('2026-09-30','10:00'));
 assert.equal(gridMove(rows,dates,from,'PageUp'),at('2026-09-30','02:00'));
 assert.equal(gridMove(rows,dates,at('2026-09-30','01:00'),'PageUp'),at('2026-09-30','00:00'));
});
test('unknown keys and unknown ids return null',()=>{
 assert.equal(gridMove(rows,dates,at('2026-09-30','06:00'),'a'),null);
 assert.equal(gridMove(rows,dates,'nope','ArrowDown'),null);
});
test('gaps are skipped; a sideways move lands on the nearest half-hour of that day',()=>{
 const partial=slots.filter(slot=>!(slot.date==='2026-10-01'&&slot.time<'09:00'));
 const r=calendarRows(dates,partial);
 assert.equal(gridMove(r,dates,at('2026-09-30','06:00'),'ArrowRight'),at('2026-10-01','09:00'));
 assert.equal(gridMove(r,dates,at('2026-10-01','09:00'),'Home'),at('2026-10-01','09:00'));
 assert.equal(gridMove(r,dates,at('2026-10-01','09:00'),'ArrowUp'),at('2026-10-01','09:00'));
});
test('cellPosition reports row and column indexes',()=>{
 assert.deepEqual(cellPosition(rows,dates,at('2026-09-30','06:00')),{row:12,col:1});
 assert.equal(cellPosition(rows,dates,'nope'),null);
});
test('one Tab stop: last focused, else first selected, else the first cell of the scroll row',()=>{
 const last=at('2026-09-30','07:00');
 assert.equal(initialFocusId({rows,dates,lastId:last,selectedIds:[],fallbackRow:16}),last);
 assert.equal(initialFocusId({rows,dates,lastId:'gone',selectedIds:[at('2026-10-01','09:00'),at('2026-09-30','10:00')],fallbackRow:16}),at('2026-09-30','10:00'));
 assert.equal(initialFocusId({rows,dates,lastId:null,selectedIds:[],fallbackRow:16}),at('2026-09-29','08:00'));
 assert.equal(initialFocusId({rows,dates:[],lastId:null,selectedIds:[],fallbackRow:0}),null);
});
test('scroll target: earliest relevant half-hour minus one hour, else 8 AM, never negative',()=>{
 assert.equal(scrollTargetRow(rows,[]),16);
 assert.equal(scrollTargetRow(rows,[at('2026-10-01','11:00'),at('2026-09-29','14:00')]),20);
 assert.equal(scrollTargetRow(rows,[at('2026-09-30','00:30')]),0);
 assert.equal(scrollTargetRow(rows,['unknown']),16);
 const late=calendarRows(dates,slots.filter(slot=>slot.time>='09:00'));
 assert.equal(scrollTargetRow(late,[]),0);
});
test('pager windows show two full days and clamp at the ends',()=>{
 const days=['a','b','c','d','e'];
 assert.deepEqual(pagerWindow(days,0,2),{start:0,dates:['a','b'],hasPrev:false,hasNext:true});
 assert.deepEqual(pagerWindow(days,4,2),{start:3,dates:['d','e'],hasPrev:true,hasNext:false});
 assert.deepEqual(pagerWindow(days,-3,2),{start:0,dates:['a','b'],hasPrev:false,hasNext:true});
 assert.deepEqual(pagerWindow(['a'],0,2),{start:0,dates:['a'],hasPrev:false,hasNext:false});
});
test('the pager follows keyboard focus to a day outside the window',()=>{
 const days=['a','b','c','d','e'];
 assert.equal(pagerStartFor(days,0,'b',2),0);
 assert.equal(pagerStartFor(days,0,'c',2),1);
 assert.equal(pagerStartFor(days,3,'a',2),0);
 assert.equal(pagerStartFor(days,1,'zz',2),1);
});
