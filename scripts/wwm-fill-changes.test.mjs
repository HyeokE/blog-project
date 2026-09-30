import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {fillChanges} from '../src/features/when-we-meet/calendar-fill.mjs';
import {fillToast} from '../src/features/when-we-meet/meeting-copy.mjs';
import {publishFillHighlight,readFillHighlight,subscribeFillHighlight,clearFillHighlight} from '../src/features/when-we-meet/fill-highlight.mjs';

const slots=makeSlots({title:'T',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'06:00',endTime:'10:00',timezone:'Asia/Seoul'});
const id=time=>slots.find(slot=>slot.time===time).id;

test('fillChanges lists added and removed slots and the changed ids in time order',()=>{
 const before=[id('09:00'),id('06:00')],after=[id('06:00'),id('07:00'),id('07:30')];
 const changes=fillChanges(before,after);
 assert.deepEqual(changes.added,[id('07:00'),id('07:30')]);
 assert.deepEqual(changes.removed,[id('09:00')]);
 assert.deepEqual(changes.changed,[id('07:00'),id('07:30'),id('09:00')]);
 assert.equal(changes.firstChanged,id('07:00'));
});
test('no change → empty lists and no first slot',()=>{
 assert.deepEqual(fillChanges([id('06:00')],[id('06:00')]),{added:[],removed:[],changed:[],firstChanged:null});
});
test('toast copy: Filled N, with removals named',()=>{
 assert.equal(fillToast(15,3),'Filled 15 · removed 3');
 assert.equal(fillToast(15,0),'Filled 15 half-hours');
 assert.equal(fillToast(1),'Filled 1 half-hour');
});
test('highlight store publishes the changed ids with a fresh nonce and notifies subscribers',()=>{
 clearFillHighlight();
 const seen=[];const stop=subscribeFillHighlight(()=>seen.push(readFillHighlight()));
 const first=readFillHighlight();
 assert.deepEqual(first.slotIds,[]);
 publishFillHighlight([id('09:00'),id('07:00')]);
 const next=readFillHighlight();
 assert.deepEqual(next.slotIds,[id('07:00'),id('09:00')]);
 assert.equal(next.firstSlotId,id('07:00'));
 assert.ok(next.nonce>first.nonce);
 assert.equal(seen.length,1);
 stop();publishFillHighlight([id('06:00')]);assert.equal(seen.length,1);
 clearFillHighlight();assert.deepEqual(readFillHighlight().slotIds,[]);
});
