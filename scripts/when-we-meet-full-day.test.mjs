import test from 'node:test';
import assert from 'node:assert/strict';
import {validateRoom,makeSlots} from '../src/features/when-we-meet/domain.mjs';
const room={title:'All day selection',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'00:00',endTime:'24:00',timezone:'Asia/Seoul'};
test('whole-day availability includes all 48 half-hours and the last 23:30 interval',()=>{
 assert.equal(validateRoom(room),null);
 const slots=makeSlots(room);assert.equal(slots.length,48);assert.equal(slots[0].time,'00:00');assert.equal(slots.at(-1).time,'23:30');
});
test('24:00 is an exclusive endpoint only, never a start or a made-up 24:30 time',()=>{
 assert.notEqual(validateRoom({...room,startTime:'24:00'}),null);
 assert.notEqual(validateRoom({...room,endTime:'24:30'}),null);
});
test('existing bounded meetings retain their stored time range',()=>{
 const slots=makeSlots({...room,startTime:'09:00',endTime:'10:00'});assert.deepEqual(slots.map(s=>s.time),['09:00','09:30']);
});
