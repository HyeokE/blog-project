import test from 'node:test';
import assert from 'node:assert/strict';
import {hourLabel} from '../src/features/when-we-meet/hour-label.mjs';
test('hour-only AM PM labels handle midnight and noon',()=>{
 assert.equal(hourLabel('00:00'),'12 AM');assert.equal(hourLabel('09:00'),'9 AM');
 assert.equal(hourLabel('12:00'),'12 PM');assert.equal(hourLabel('18:00'),'6 PM');
 assert.equal(hourLabel('23:00'),'11 PM');assert.equal(hourLabel('09:30'),'');
});
