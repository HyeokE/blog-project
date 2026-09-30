import test from 'node:test';
import assert from 'node:assert/strict';
import {monthBoundaryLabel} from '../src/features/when-we-meet/month-boundary.mjs';
test('labels first column and month changes, not ordinary days',()=>{
 assert.equal(monthBoundaryLabel('2026-09-29'), 'Sep');
 assert.equal(monthBoundaryLabel('2026-09-30','2026-09-29'), '');
 assert.equal(monthBoundaryLabel('2026-10-01','2026-09-30'), 'Oct');
});
test('year boundary includes year',()=>{
 assert.equal(monthBoundaryLabel('2027-01-01','2026-12-31'), 'Jan 2027');
});
