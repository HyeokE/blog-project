import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {dragRange,tapRange,rangeSlotIds,rangeFields,fieldsRange,rangeInstants} from '../src/features/when-we-meet/confirm-selection.mjs';

const room=(over={})=>({title:'T',startDate:'2026-10-01',endDate:'2026-10-02',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul',...over});
const slots=makeSlots(room());
const at=(list,date,time,occurrence=0)=>list.filter(slot=>slot.date===date&&slot.time===time)[occurrence];

test('a click selects exactly one half-hour; the end is exclusive',()=>{
 const s=at(slots,'2026-10-01','10:00');
 const range=dragRange(slots,s.id,s.id);
 assert.deepEqual(range,{date:'2026-10-01',startId:s.id,endId:s.id});
 assert.deepEqual(rangeSlotIds(slots,range),[s.id]);
 assert.deepEqual(rangeFields(slots,range),{date:'2026-10-01',start:'10:00',end:'10:30'});
 assert.deepEqual(rangeInstants(range),{start:'2026-10-01T01:00:00.000Z',end:'2026-10-01T01:30:00.000Z'});
});

test('dragging within a day selects the contiguous range in either direction',()=>{
 const a=at(slots,'2026-10-01','10:00'),b=at(slots,'2026-10-01','11:30');
 const down=dragRange(slots,a.id,b.id),up=dragRange(slots,b.id,a.id);
 assert.deepEqual(down,up);
 assert.equal(rangeSlotIds(slots,down).length,4);
 assert.deepEqual(rangeFields(slots,down),{date:'2026-10-01',start:'10:00',end:'12:00'});
});

test('dragging across a day boundary clamps to the start day',()=>{
 const anchor=at(slots,'2026-10-01','15:00');
 const later=dragRange(slots,anchor.id,at(slots,'2026-10-02','09:30').id);
 assert.deepEqual(rangeFields(slots,later),{date:'2026-10-01',start:'15:00',end:'18:00'});
 const second=at(slots,'2026-10-02','12:00');
 const earlier=dragRange(slots,second.id,at(slots,'2026-10-01','17:00').id);
 assert.deepEqual(rangeFields(slots,earlier),{date:'2026-10-02',start:'09:00',end:'12:30'});
 assert.equal(dragRange(slots,'missing',second.id),null);
});

test('a 24:00 room ends at the next local midnight',()=>{
 const all=makeSlots(room({startTime:'00:00',endTime:'24:00'}));
 const range=dragRange(all,at(all,'2026-10-01','23:00').id,at(all,'2026-10-01','23:30').id);
 assert.deepEqual(rangeFields(all,range),{date:'2026-10-01',start:'23:00',end:'24:00'});
 assert.deepEqual(rangeInstants(range),{start:'2026-10-01T14:00:00.000Z',end:'2026-10-01T15:00:00.000Z'});
 assert.deepEqual(fieldsRange(all,{date:'2026-10-01',start:'23:00',end:'24:00'}),range);
});

test('a DST fall-back day keeps the exact repeated half-hour by slot id',()=>{
 const ny=makeSlots(room({startTime:'00:00',endTime:'24:00',timezone:'America/New_York',startDate:'2026-11-01',endDate:'2026-11-01'}));
 const firstOne=at(ny,'2026-11-01','01:00',0),secondOne=at(ny,'2026-11-01','01:00',1),secondHalf=at(ny,'2026-11-01','01:30',1);
 assert.notEqual(firstOne.id,secondOne.id);
 const repeated=dragRange(ny,secondOne.id,secondHalf.id);
 assert.deepEqual(rangeSlotIds(ny,repeated),[secondOne.id,secondHalf.id]);
 assert.deepEqual(rangeInstants(repeated),{start:'2026-11-01T06:00:00.000Z',end:'2026-11-01T07:00:00.000Z'});
 const across=dragRange(ny,at(ny,'2026-11-01','00:30').id,at(ny,'2026-11-01','02:00').id);
 assert.equal(rangeSlotIds(ny,across).length,6,'both 01:00 hours are covered in UTC order');
 assert.deepEqual(rangeInstants(across),{start:'2026-11-01T04:30:00.000Z',end:'2026-11-01T07:30:00.000Z'});
 // Typed wall clocks are ambiguous: start takes the first occurrence and end the last, matching proposalInstants.
 assert.deepEqual(rangeInstants(fieldsRange(ny,{date:'2026-11-01',start:'01:00',end:'02:00'})),{start:'2026-11-01T05:00:00.000Z',end:'2026-11-01T07:00:00.000Z'});
});

test('taps (touch or keyboard) set the start, then the end',()=>{
 const a=at(slots,'2026-10-01','10:00'),b=at(slots,'2026-10-01','11:00'),c=at(slots,'2026-10-02','09:00');
 const first=tapRange({anchor:null},slots,b.id);
 assert.deepEqual(first,{anchor:b.id,range:{date:'2026-10-01',startId:b.id,endId:b.id}});
 const second=tapRange(first,slots,a.id);
 assert.deepEqual(second,{anchor:null,range:{date:'2026-10-01',startId:a.id,endId:b.id}});
 assert.deepEqual(tapRange(first,slots,c.id),{anchor:c.id,range:{date:'2026-10-02',startId:c.id,endId:c.id}},'another date starts over');
 assert.deepEqual(tapRange(second,slots,c.id).anchor,c.id,'a completed range starts over');
});

test('typed date and times map back to slot ids or to nothing',()=>{
 const range=fieldsRange(slots,{date:'2026-10-02',start:'09:30',end:'11:00'});
 assert.deepEqual(rangeFields(slots,range),{date:'2026-10-02',start:'09:30',end:'11:00'});
 assert.equal(fieldsRange(slots,{date:'2026-10-02',start:'11:00',end:'11:00'}),null);
 assert.equal(fieldsRange(slots,{date:'2026-10-02',start:'08:00',end:'10:00'}),null);
 assert.equal(fieldsRange(slots,{date:'2026-10-05',start:'09:00',end:'10:00'}),null);
 assert.equal(fieldsRange(slots,{date:'2026-10-02',start:'',end:'10:00'}),null);
 assert.equal(rangeFields(slots,null),null);
});

test('review status is computed from saved slots for the selected range, not "any response"',async()=>{
 const {selectionAvailability}=await import('../src/features/when-we-meet/confirm-selection.mjs');
 const day='2026-10-01',ids=times=>times.map(time=>at(slots,day,time).id);
 const range=dragRange(slots,at(slots,day,'12:00').id,at(slots,day,'13:00').id); // 12:00–13:30
 const members=[{id:'full',name:'Full'},{id:'part',name:'Part'},{id:'split',name:'Split'},{id:'none',name:'None'},{id:'quiet',name:'Quiet'},{id:'ghost',name:'Ghost'}];
 const responses=[
  {userId:'full',displayName:'Full',slots:ids(['11:30','12:00','12:30','13:00'])},
  {userId:'part',displayName:'Part',slots:ids(['12:00','12:30'])},
  {userId:'split',displayName:'Split',slots:ids(['12:00','13:00'])},
  {userId:'none',displayName:'None',slots:ids(['09:00'])},
  {userId:'quiet',displayName:'Quiet',slots:[]},
 ];
 const out=selectionAvailability(members,responses,slots,range);
 assert.deepEqual(out.map(m=>[m.id,m.response,m.availability]),[
  ['full','available',undefined],
  ['part','partial','Available 12:00–13:00'],
  ['split','partial','Partly available'],
  ['none','unavailable',undefined],
  ['quiet','not-responded',undefined],
  ['ghost','not-responded',undefined],
 ]);
 // Without a selection the base statuses pass through untouched.
 const base=[{id:'full',name:'Full',response:'available'}];
 assert.equal(selectionAvailability(base,responses,slots,null),base);
 // A partial run touching the last 23:30 slot ends at 24:00.
 const all=makeSlots(room({startTime:'00:00',endTime:'24:00'}));
 const late=dragRange(all,at(all,day,'23:00').id,at(all,day,'23:30').id);
 assert.equal(selectionAvailability([{id:'x',name:'X'}],[{userId:'x',displayName:'X',slots:[at(all,day,'23:30').id]}],all,late)[0].availability,'Available 23:30–24:00');
});
