import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {fillPreview,fillFailure,fillSummary} from '../src/features/when-we-meet/calendar-fill.mjs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const slots=makeSlots({title:'T',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'09:00',endTime:'11:00',timezone:'Asia/Seoul'});

test('preview keeps only known room slot ids, deduped and sorted like toggleSlot',()=>{
 const ids=[slots[2].id,slots[0].id,slots[2].id,'2020-01-01T00:00:00.000Z'];
 const preview=fillPreview({availableSlotIds:ids,slotCount:4},slots);
 assert.deepEqual(preview.slotIds,[slots[0].id,slots[2].id]);
 assert.equal(preview.freeCount,2);assert.equal(preview.slotCount,4);assert.equal(preview.canApply,true);
});
test('zero free slots cannot be applied and says so plainly',()=>{
 const preview=fillPreview({availableSlotIds:[],slotCount:4},slots);
 assert.equal(preview.canApply,false);
 assert.match(fillSummary(preview),/No free half-hours/);
 assert.equal(fillSummary(fillPreview({availableSlotIds:[slots[1].id],slotCount:4},slots)),'1 of 4 half-hours free in your calendar.');
});
test('malformed preview payload is rejected rather than applied',()=>{
 assert.throws(()=>fillPreview({availableSlotIds:'x',slotCount:4},slots));
 assert.throws(()=>fillPreview(null,slots));
 assert.throws(()=>fillPreview({availableSlotIds:[],slotCount:-1},slots));
});
test('409 reconnect maps to a connect action; other failures are retryable errors',()=>{
 assert.deepEqual(fillFailure({status:409,reconnect:true,message:'x'}),{kind:'reconnect'});
 assert.equal(fillFailure({status:502,reconnect:false,message:'Could not read your calendar.'}).kind,'error');
 assert.equal(fillFailure(new Error('offline')).kind,'error');
 assert.equal(fillFailure({status:409,reconnect:false}).kind,'error');
});
test('Apply goes through the shared draft path and the action is available to every member',()=>{
 const sync=read('src/features/when-we-meet/useAvailabilitySync.ts');
 assert.match(sync,/const replace=useCallback\(\(slots:string\[\]\)=>\{update\(\{\.\.\.draft\.current,slots/);
 const fill=read('src/features/when-we-meet/CalendarFill.tsx');
 assert.match(fill,/loadCalendarBusy\(roomId\)/);
 assert.match(fill,/title=t\('fill\.trigger'\)/);
 assert.match(fill,/>\{t\('common\.cancel'\)\}<\/Button>/);
 // Anchored panel on desktop, the shared Dialog sheet on phones.
 assert.match(fill,/<PopoverAnchor asChild>\{button\}<\/PopoverAnchor>/);
 assert.match(fill,/if\(phone\)return <>\{button\}<Dialog /);
 assert.match(fill,/fillButtonLabel\(summary\.freeCount\)/);
 assert.match(fill,/toast\.success\(copy\.fillToast\(summary\.freeCount,changes\.removed\.length\),\{duration:UNDO_TOAST_MS,action:\{label:t\('fill\.undo'\)/);
 assert.match(fill,/t\('fill\.connectGoogleCalendar'\)/);
 assert.doesNotMatch(fill,/saveResponse|skeleton/i);
 const room=read('src/features/when-we-meet/WhenWeMeet.tsx');
 assert.match(room,/view==='availability'\?<CalendarFill [^>]*onApply=\{sync\.replace\}/);
 assert.match(room,/toolbar=\{fill\}/);
 assert.doesNotMatch(room,/<CalendarFill [^>]*(owner|role)/);
});
test('ApiError keeps status and reconnect without breaking request callers',()=>{
 const api=read('src/features/when-we-meet/api.ts');
 assert.match(api,/export class ApiError extends Error/);
 assert.match(api,/throw new ApiError\(/);
 assert.match(api,/calendar\/busy/);
 const mock=read('src/stories/wwm/mock-api.ts');
 assert.match(mock,/export async function loadCalendarBusy/);
});

import {applyFillInRange,fillSummaryInRange} from '../src/features/when-we-meet/calendar-fill.mjs';
import {isRangeDateDisabled} from '../src/features/when-we-meet/range.mjs';
const week=makeSlots({title:'T',startDate:'2026-10-01',endDate:'2026-10-03',startTime:'09:00',endTime:'10:00',timezone:'Asia/Seoul'});
const on=date=>week.filter(s=>s.date===date).map(s=>s.id);
test('applying a period replaces only that period and keeps selections outside it',()=>{
 const selected=[...on('2026-10-01'),on('2026-10-03')[0]];
 const free=[on('2026-10-02')[1],on('2026-10-03')[1]];
 const next=applyFillInRange(selected,free,week,{start:'2026-10-02',end:'2026-10-02'});
 assert.deepEqual(next,[...on('2026-10-01'),on('2026-10-02')[1],on('2026-10-03')[0]].sort());
});
test('the whole room period behaves like a full replacement',()=>{
 const free=[on('2026-10-02')[0]];
 assert.deepEqual(applyFillInRange(on('2026-10-01'),free,week,{start:'2026-10-01',end:'2026-10-03'}),free);
});
test('summary counts only half-hours inside the chosen period',()=>{
 const preview=fillPreview({availableSlotIds:[on('2026-10-01')[0],on('2026-10-02')[0],on('2026-10-02')[1]],slotCount:week.length},week);
 const s=fillSummaryInRange(preview,week,{start:'2026-10-02',end:'2026-10-02'});
 assert.equal(s.freeCount,2);assert.equal(s.slotCount,2);assert.equal(s.canApply,true);
 assert.match(s.text,/2 of 2 half-hours free/);
 assert.equal(fillSummaryInRange(preview,week,{start:'2026-10-03',end:'2026-10-03'}).canApply,false);
});
test('period picker cannot go past the room end date',()=>{
 const idle={start:'',end:'',phase:'start',error:''};
 assert.equal(isRangeDateDisabled(idle,'2026-10-04','2026-10-01','2026-10-03'),true);
 assert.equal(isRangeDateDisabled(idle,'2026-10-03','2026-10-01','2026-10-03'),false);
 assert.equal(isRangeDateDisabled(idle,'2026-10-04','2026-10-01'),false,'no max keeps create-form behavior');
});
