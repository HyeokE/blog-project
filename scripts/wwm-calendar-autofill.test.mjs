import {test} from 'node:test';
import assert from 'node:assert/strict';
import {availableSlotsFromBusy} from '../src/features/when-we-meet/calendar-autofill.mjs';
const slots=[0,1,2].map(i=>({id:`slot-${i}`,utc:new Date(Date.UTC(2026,9,1,0,i*30)).toISOString()}));
test('empty busy list preserves all offered room slots',()=>assert.deepEqual(availableSlotsFromBusy(slots,[]),['slot-0','slot-1','slot-2']));
test('any overlap blocks slot; touching endpoints does not',()=>assert.deepEqual(availableSlotsFromBusy(slots,[{start:'2026-10-01T00:15:00Z',end:'2026-10-01T00:30:00Z'}]),['slot-1','slot-2']));
test('offset instants and overlapping busy periods merge naturally',()=>assert.deepEqual(availableSlotsFromBusy(slots,[{start:'2026-10-01T09:30:00+09:00',end:'2026-10-01T10:00:00+09:00'},{start:'2026-10-01T00:45:00Z',end:'2026-10-01T01:15:00Z'}]),['slot-0']));
test('invalid or missing busy data must never imply free time',()=>{for(const value of [null,undefined,[{start:'invalid',end:'invalid'}],[{start:'2026-10-01T01:00:00Z',end:'2026-10-01T00:00:00Z'}]])assert.throws(()=>availableSlotsFromBusy(slots,value));});
