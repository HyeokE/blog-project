import test from 'node:test';
import assert from 'node:assert/strict';
import {hourLabel} from '../src/features/when-we-meet/hour-label.mjs';
test('hour-only AM PM labels handle midnight and noon',()=>{
 assert.equal(hourLabel('00:00'),'12 AM');assert.equal(hourLabel('09:00'),'9 AM');
 assert.equal(hourLabel('12:00'),'12 PM');assert.equal(hourLabel('18:00'),'6 PM');
 assert.equal(hourLabel('23:00'),'11 PM');assert.equal(hourLabel('09:30'),'');
});
import {clockLabel,dayLabel} from '../src/features/when-we-meet/hour-label.mjs';
test('cell names use the meeting wall clock: 6:00 AM, 12:30 PM, and Wed, Sep 30',()=>{
 assert.equal(clockLabel('06:00'),'6:00 AM');assert.equal(clockLabel('00:30'),'12:30 AM');
 assert.equal(clockLabel('12:30'),'12:30 PM');assert.equal(clockLabel('23:00'),'11:00 PM');
 assert.equal(dayLabel('2026-09-30'),'Wed, Sep 30');assert.equal(dayLabel('2026-10-01'),'Thu, Oct 1');
});
