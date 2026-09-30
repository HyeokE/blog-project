import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRoom, normalizeResponses } from '../src/features/when-we-meet/normalize.mjs';
import { makeSlots, aggregate } from '../src/features/when-we-meet/domain.mjs';

test('real Supabase time and timestamptz representations produce matching availability',()=>{
  const room=normalizeRoom({id:'r',title:'Meet',start_date:'2026-10-01',end_date:'2026-10-02',start_time:'09:00:00',end_time:'11:00:00',timezone:'Asia/Seoul'});
  const responses=normalizeResponses([{user_id:'u',display_name:'A',slots:['2026-10-01T00:00:00+00:00','2026-10-01T00:30:00+00:00']}]);
  assert.equal(room.start_time,'09:00');
  assert.equal(room.end_time,'11:00');
  const slots=makeSlots({title:room.title,startDate:room.start_date,endDate:room.end_date,startTime:room.start_time,endTime:room.end_time,timezone:room.timezone});
  assert.equal(slots.length,8);
  assert.deepEqual(responses[0].slots,slots.slice(0,2).map(x=>x.id));
  assert.equal(aggregate(slots.map(x=>x.id),responses)[0].count,1);
});
