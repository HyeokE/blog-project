import test from 'node:test';
import assert from 'node:assert/strict';
import { calendarDays, moveCalendarDate, halfHourOptions } from '../src/features/when-we-meet/picker.mjs';

test('calendar has Monday-first complete weeks and preserves ISO dates',()=>{
  const days=calendarDays('2026-09-01');
  assert.equal(days.length,35);
  assert.equal(days[0],'2026-08-31');
  assert.equal(days.at(-1),'2026-10-04');
});
test('arrow navigation crosses months and handles leap days',()=>{
  assert.equal(moveCalendarDate('2028-02-28','ArrowRight'),'2028-02-29');
  assert.equal(moveCalendarDate('2028-03-01','ArrowLeft'),'2028-02-29');
  assert.equal(moveCalendarDate('2026-09-30','ArrowDown'),'2026-10-07');
  assert.equal(moveCalendarDate('2026-09-30','Home'),'2026-09-28');
});
test('time options use 30 minute wall-time values',()=>{
  const options=halfHourOptions();
  assert.equal(options.length,48);
  assert.equal(options[0],'00:00');
  assert.equal(options.at(-1),'23:30');
  assert.equal(options[19],'09:30');
});
