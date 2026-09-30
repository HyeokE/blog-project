import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import { halfHourOptions } from '../src/features/when-we-meet/picker.mjs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('every date picker is the shared Sunday-first Calendar (no custom Monday-first grid)',()=>{
  const time=read('../src/features/when-we-meet/DateTimePicker.tsx');
  const range=read('../src/features/when-we-meet/DateRangePicker.tsx');
  for(const source of [time,range]){
    assert.match(source,/from '@\/components\/ui\/calendar'/);
    assert.match(source,/weekStartsOn=\{0\}/);
    assert.doesNotMatch(source,/calendarDays|moveCalendarDate|role="gridcell"|\['M','T','W'/);
  }
  assert.match(time,/<Calendar mode="single"/);
  assert.match(time,/formatCraftDate\(value\)/,'single dates display as yyyy.mm.dd like the range field');
});
test('time options use 30 minute wall-time values',()=>{
  const options=halfHourOptions();
  assert.equal(options.length,48);
  assert.equal(options[0],'00:00');
  assert.equal(options.at(-1),'23:30');
  assert.equal(options[19],'09:30');
});
