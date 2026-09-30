import test from 'node:test';
import assert from 'node:assert/strict';
import {rangeDays,selectRangeDate,resetRange} from '../src/features/when-we-meet/range.mjs';

test('first click starts and second click completes an inclusive range across months',()=>{
 const first=selectRangeDate({start:'',end:'',phase:'start'},'2026-09-30');
 assert.deepEqual(first,{start:'2026-09-30',end:'',phase:'end',error:''});
 const done=selectRangeDate(first,'2026-10-02');
 assert.equal(rangeDays(done.start,done.end),3);
 assert.equal(done.phase,'complete');
});
test('reverse selection restarts at earlier day',()=>{
 assert.deepEqual(selectRangeDate({start:'2026-10-08',end:'',phase:'end'},'2026-10-07'),{start:'2026-10-07',end:'',phase:'end',error:''});
});
test('28 inclusive days allowed but 29 gives feedback without changing selection',()=>{
 const pending={start:'2026-09-29',end:'',phase:'end'};
 assert.equal(selectRangeDate(pending,'2026-10-26').phase,'complete');
 assert.deepEqual(selectRangeDate(pending,'2026-10-27'),{...pending,error:'최대 28일까지 선택할 수 있어요.'});
});
test('reset and cancel/application preserve committed values independently',()=>{
 const committed={start:'2026-09-29',end:'2026-10-01'};
 const draft=resetRange();
 assert.deepEqual(draft,{start:'',end:'',phase:'start',error:''});
 assert.deepEqual(committed,{start:'2026-09-29',end:'2026-10-01'});
 const applied=selectRangeDate(selectRangeDate(draft,'2026-10-02'),'2026-10-03');
 assert.deepEqual({start:applied.start,end:applied.end},{start:'2026-10-02',end:'2026-10-03'});
});
