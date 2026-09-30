import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarRows} from '../src/features/when-we-meet/calendar-rows.mjs';
const slot=(date,time,id)=>({date,time,id,utc:id});
test('shared vertical rows preserve chronological repeated wall times by occurrence',()=>{
 const days=['2026-10-31','2026-11-01'];
 const slots=[slot(days[0],'01:00','2026-10-31T05:00:00.000Z'),slot(days[0],'01:30','2026-10-31T05:30:00.000Z'),slot(days[1],'01:00','2026-11-01T05:00:00.000Z'),slot(days[1],'01:30','2026-11-01T05:30:00.000Z'),slot(days[1],'01:00','2026-11-01T06:00:00.000Z'),slot(days[1],'01:30','2026-11-01T06:30:00.000Z')];
 const rows=calendarRows(days,slots);
 assert.deepEqual(rows.map(r=>r.time),['01:00','01:30','01:00','01:30']);
 assert.deepEqual(rows.map(r=>r.byDate[days[1]]?.id),slots.slice(2).map(s=>s.id));
 assert.equal(rows[2].byDate[days[0]],undefined);
 assert.notEqual(rows[0].key,rows[2].key);
});
test('missing spring-forward time is a gap rather than a shifted slot',()=>{
 const days=['2027-03-13','2027-03-14'];
 const rows=calendarRows(days,[slot(days[0],'02:00','2027-03-13T07:00:00.000Z'),slot(days[1],'03:00','2027-03-14T07:00:00.000Z')]);
 assert.equal(rows.find(r=>r.time==='02:00')?.byDate[days[1]],undefined);
});
