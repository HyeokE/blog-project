import assert from 'node:assert/strict';
import test from 'node:test';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {projectSlots,timezoneView} from '../src/features/when-we-meet/view-timezone.mjs';

const seoul=(extra={})=>({title:'t',startDate:'2026-10-02',endDate:'2026-10-02',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul',...extra});
const view=(room,zone,useZone=true)=>timezoneView({slots:makeSlots(room),roomZone:room.timezone,zone,useZone});

test('a Seoul room read in New York relabels the same instants on the New York clock',()=>{
 const slots=makeSlots(seoul()),shown=view(seoul(),'America/New_York');
 assert.equal(shown.offered,true);
 assert.deepEqual(shown.slots.map(s=>s.id),slots.map(s=>s.id));
 assert.deepEqual([shown.slots[0].date,shown.slots[0].time],['2026-10-01','20:00']);
 assert.deepEqual([shown.slots.at(-1).date,shown.slots.at(-1).time],['2026-10-02','04:30']);
 assert.equal(shown.startDate,'2026-10-01');
 assert.equal(shown.endDate,'2026-10-02');
});

test('before the choice is made the room clock stays, but the switch is offered',()=>{
 const slots=makeSlots(seoul()),shown=view(seoul(),'America/New_York',false);
 assert.equal(shown.offered,true);
 assert.deepEqual(shown.slots,slots);
 assert.equal(shown.zone,'Asia/Seoul');
});

test('no switch when the device zone is the room zone, reads the same, or is off the half hour',()=>{
 assert.equal(view(seoul(),'Asia/Seoul').offered,false);
 assert.equal(view(seoul(),'Asia/Tokyo').offered,false);
 assert.equal(view(seoul(),'Asia/Kathmandu').offered,false);
 assert.equal(view(seoul(),'').offered,false);
 assert.equal(view(seoul(),'Not/AZone').offered,false);
});

test('half-hour offsets (India, +5:30) stay on the grid',()=>{
 const shown=view(seoul(),'Asia/Kolkata');
 assert.equal(shown.offered,true);
 assert.deepEqual([shown.slots[0].date,shown.slots[0].time],['2026-10-02','05:30']);
});

test('the repeated fall-back hour in New York keeps two distinct slots with the same label',()=>{
 const room=seoul({startDate:'2026-11-01',endDate:'2026-11-01',startTime:'00:00',endTime:'24:00'});
 const shown=view(room,'America/New_York');
 const ids=new Set(shown.slots.map(s=>s.id));
 assert.equal(ids.size,shown.slots.length);
 const repeated=shown.slots.filter(s=>s.date==='2026-11-01'&&s.time==='01:00');
 assert.equal(repeated.length,2);
 assert.notEqual(repeated[0].id,repeated[1].id);
 assert.deepEqual(shown.slots.map(s=>s.id),[...shown.slots.map(s=>s.id)].sort());
});

test('projection never changes ids, utc or order',()=>{
 const slots=makeSlots(seoul({endDate:'2026-10-05'}));
 const projected=projectSlots(slots,'Pacific/Auckland');
 assert.deepEqual(projected.map(s=>[s.id,s.utc]),slots.map(s=>[s.id,s.utc]));
});
