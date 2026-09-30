import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleDates, shiftWindow, slotLabel, rangePreview} from '../src/features/when-we-meet/schedule-view.mjs';
const dates=Array.from({length:14},(_,i)=>new Date(Date.UTC(2026,8,29+i)).toISOString().slice(0,10));
test('day window clamps at both ends without losing selected slots',()=>{
 assert.deepEqual(visibleDates(dates,0,3),dates.slice(0,3));
 assert.deepEqual(visibleDates(dates,12,3),dates.slice(11,14));
 assert.equal(shiftWindow(0,-1,14,3),0);
 assert.equal(shiftWindow(0,1,14,3),3);
 assert.equal(shiftWindow(12,1,14,3),11);
});
test('view labels distinguish editing from overlap without changing values',()=>{
 assert.equal(slotLabel('mine',true,2,3),'Selected');
 assert.equal(slotLabel('overlap',false,2,3),'2/3 available');
 assert.equal(slotLabel('overlap',false,0,0),'No saved responses');
});
test('range preview counts inclusive dates within limit',()=>{
 assert.deepEqual(rangePreview('2026-09-29','2026-10-26'),{days:28,valid:true});
 assert.deepEqual(rangePreview('2026-09-29','2026-10-27'),{days:29,valid:false});
});

import {offsetForDate,calendarDays} from '../src/features/when-we-meet/schedule-view.mjs';
test('calendar jump includes selected day across month boundary and rejects unavailable days',()=>{assert.equal(offsetForDate(dates,'2026-10-12'),11);assert.equal(offsetForDate(dates,'2026-10-01'),2);assert.equal(offsetForDate(dates,'2026-10-13'),null);assert.equal(calendarDays(2026,9).filter(Boolean).length,31);assert.equal(calendarDays(2026,9).find(Boolean),'2026-10-01')});
