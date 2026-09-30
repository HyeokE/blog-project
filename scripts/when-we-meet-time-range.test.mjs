import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validTimeOptions} from '../src/features/when-we-meet/time-options.mjs';
import {readFileSync} from 'node:fs';
test('end time includes midnight after last start, never same or earlier',()=>{assert.deepEqual(validTimeOptions({minTime:'23:30'}),['24:00']);assert.ok(validTimeOptions({minTime:'09:00'}).every(t=>t>'09:00'));assert.equal(validTimeOptions({max:'23:30'}).includes('24:00'),false)});
test('create sends selected range instead of forced full day',()=>{const s=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');assert.match(s,/start_time:form.startTime,end_time:form.endTime/);assert.match(s,/<TimeRangeFields/)});
