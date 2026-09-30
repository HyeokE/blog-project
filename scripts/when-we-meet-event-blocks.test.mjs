import {readFileSync} from 'node:fs';
import test from 'node:test';
test('calendar uses continuous labeled event blocks instead of per-cell plus and counts',()=>{
 const source=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
 assert.match(source,/className="wwm-calendar-event"/);
 assert.doesNotMatch(source,/selected\?'✓':'\+'/);
 assert.doesNotMatch(source,/className="wwm-week-count"/);
});
test('fallback repeated hour precedes the following ordinary hour',()=>{
 const date='2026-11-01';
 const slots=['05:00','05:30','06:00','06:30','07:00'].map((utc,i)=>({date,id:`2026-11-01T${utc}:00.000Z`,time:['01:00','01:30','01:00','01:30','02:00'][i]}));
 assert.deepEqual(calendarRows([date],slots).map(r=>r.time),['01:00','01:30','01:00','01:30','02:00']);
});
import assert from 'node:assert/strict';
import {calendarRows,eventBlocks} from '../src/features/when-we-meet/calendar-rows.mjs';
const slot=(date,time,hour,minute=0)=>({date,time,id:new Date(Date.UTC(2026,9,Number(date.slice(-2)),hour,minute)).toISOString()});
test('adjacent UTC slots merge into duration-spanning blocks and overlaps occupy lanes',()=>{
 const date='2026-10-26',slots=[slot(date,'09:00',13),slot(date,'09:30',13,30),slot(date,'10:00',14)];
 const rows=calendarRows([date],slots);
 const people=[{userId:'a',label:'Alex',color:'red',runs:[{date,startUtc:slots[0].id,endUtc:new Date(Date.parse(slots[2].id)+1800000).toISOString(),slotIds:slots.map(s=>s.id)}]},{userId:'b',label:'Sam',color:'blue',runs:[{date,startUtc:slots[1].id,endUtc:slots[2].id,slotIds:[slots[1].id]}]}];
 const blocks=eventBlocks(rows,[date],people);
 assert.equal(blocks.length,2);
 assert.deepEqual(blocks.map(b=>[b.top,b.height,b.lane,b.lanes]),[[0,144,0,2],[48,48,1,2]]);
});
test('repeated DST wall times map to distinct UTC rows',()=>{
 const date='2026-11-01',slots=[{date,time:'01:00',id:'2026-11-01T05:00:00.000Z'},{date,time:'01:30',id:'2026-11-01T05:30:00.000Z'},{date,time:'01:00',id:'2026-11-01T06:00:00.000Z'}];
 const blocks=eventBlocks(calendarRows([date],slots),[date],[{userId:'a',runs:[{date,startUtc:slots[0].id,endUtc:'2026-11-01T06:30:00.000Z',slotIds:slots.map(s=>s.id)}]}]);
 assert.equal(blocks[0].height,144);
});
