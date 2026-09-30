import test from 'node:test';
import assert from 'node:assert/strict';
import {isRangeDateDisabled,rangeDays,selectRangeDate} from '../src/features/when-we-meet/range.mjs';

const today='2026-09-30';
const awaitingEnd={start:'2026-09-29',end:'',phase:'end',error:''};

test('awaiting an end date: the 14th inclusive day stays enabled and the 15th is disabled',()=>{
 assert.equal(rangeDays(awaitingEnd.start,'2026-10-12'),14);
 assert.equal(isRangeDateDisabled(awaitingEnd,'2026-10-12','2026-09-01'),false);
 assert.equal(isRangeDateDisabled(awaitingEnd,'2026-10-13','2026-09-01'),true);
 assert.equal(isRangeDateDisabled(awaitingEnd,'2026-12-25','2026-09-01'),true);
});
test('cross-month 14-day window from the reference start',()=>{
 const pending={start:'2026-10-25',end:'',phase:'end',error:''};
 assert.equal(isRangeDateDisabled(pending,'2026-11-07',today),false);
 assert.equal(isRangeDateDisabled(pending,'2026-11-08',today),true);
});
test('earlier dates (reverse restart) and the start itself stay enabled while awaiting an end',()=>{
 const pending={start:'2026-10-10',end:'',phase:'end',error:''};
 assert.equal(isRangeDateDisabled(pending,'2026-10-01',today),false);
 assert.equal(isRangeDateDisabled(pending,'2026-10-10',today),false);
});
test('choosing a start never disables far dates, including when both dates are committed',()=>{
 const reopened={start:'2026-10-01',end:'2026-10-03',phase:'start',error:''};
 assert.equal(isRangeDateDisabled(reopened,'2027-03-01',today),false);
 assert.equal(isRangeDateDisabled({start:'',end:'',phase:'start',error:''},'2027-03-01',today),false);
 assert.equal(isRangeDateDisabled({start:'2026-10-01',end:'2026-10-03',phase:'complete',error:''},'2027-03-01',today),false);
});
test('dates before the minimum are disabled in every phase',()=>{
 assert.equal(isRangeDateDisabled({start:'',end:'',phase:'start',error:''},'2026-09-29',today),true);
 assert.equal(isRangeDateDisabled({start:'2026-10-02',end:'',phase:'end',error:''},'2026-09-29',today),true);
 assert.equal(isRangeDateDisabled({start:'',end:'',phase:'start',error:''},today,today),false);
});
test('pure selection still rejects a 15th-day endpoint as defense in depth, keeping the draft',()=>{
 const rejected=selectRangeDate(awaitingEnd,'2026-10-13');
 assert.equal(rejected.start,awaitingEnd.start);
 assert.equal(rejected.phase,'end');
 assert.ok(rejected.error);
 assert.equal(selectRangeDate(awaitingEnd,'2026-09-29').phase,'complete');
});
