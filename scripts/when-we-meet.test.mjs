import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRoom, makeSlots, aggregate, toggleSlot } from '../src/features/when-we-meet/domain.mjs';

test('rejects calendar dates that roll into another month',()=>{
  const room={title:'Meet',startDate:'2026-02-30',endDate:'2026-03-01',startTime:'09:00',endTime:'10:00',timezone:'Asia/Seoul'};
  assert.match(validateRoom(room),/valid dates/);
});
test('validates inclusive date and aligned time bounds',()=>{
  assert.equal(validateRoom({title:'Dinner',startDate:'2026-10-01',endDate:'2026-10-28',startTime:'09:00',endTime:'10:00',timezone:'Asia/Seoul'}), null);
  assert.match(validateRoom({title:'Dinner',startDate:'2026-10-01',endDate:'2026-10-29',startTime:'09:00',endTime:'10:00',timezone:'Asia/Seoul'}), /28/);
  assert.match(validateRoom({title:'Dinner',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'09:15',endTime:'10:00',timezone:'Asia/Seoul'}), /30/);
  assert.match(validateRoom({title:'Dinner',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'10:00',endTime:'09:00',timezone:'Asia/Seoul'}), /time/i);
});
test('converts room-local wall slots to UTC and skips DST gaps', () => {
  const slots=makeSlots({title:'Test',startDate:'2026-03-08',endDate:'2026-03-08',startTime:'02:00',endTime:'03:30',timezone:'America/New_York'});
  assert.equal(slots.length,1);
  assert.equal(slots[0].utc,'2026-03-08T07:00:00.000Z');
  assert.equal(makeSlots({title:'Test',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'09:00',endTime:'10:00',timezone:'Asia/Seoul'})[0].utc,'2026-10-01T00:00:00.000Z');
});
test('toggle and overlap ranks fully shared slots first', () => {
  assert.deepEqual(toggleSlot(['a'],'a'),[]);
  assert.deepEqual(toggleSlot([],'a'),['a']);
  assert.deepEqual(aggregate(['a','b'],[{id:'1',slots:['a','b']},{id:'2',slots:['b']}]).map(x=>[x.id,x.count,x.all]),[['b',2,true],['a',1,false]]);
});
