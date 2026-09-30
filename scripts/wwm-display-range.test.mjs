import test from 'node:test';
import assert from 'node:assert/strict';
import {formatCraftDate,formatCraftRange} from '../src/features/when-we-meet/display-date.mjs';

test('dates display as yyyy.mm.dd and ranges join with a spaced en dash',()=>{
 assert.equal(formatCraftDate('2026-09-30'),'2026.09.30');
 assert.equal(formatCraftRange('2026-09-30','2026-10-02'),'2026.09.30 – 2026.10.02');
 assert.equal(formatCraftRange('2026-09-30','2026-09-30'),'2026.09.30');
 assert.equal(formatCraftRange('2026-09-30',''),'2026.09.30 – ');
 assert.equal(formatCraftRange('',''),'');
});
