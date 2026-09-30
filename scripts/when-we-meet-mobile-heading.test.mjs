import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const component=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/when-we-meet/week-calendar.css',import.meta.url),'utf8');
test('no repeated month-range heading: the room header has the dates; day headers label a month where it changes',async()=>{
 assert.doesNotMatch(component,/lastMonth|<h3>\{month\}/);
 assert.match(component,/monthBoundaryLabel\(date,dates\[index-1\],locale\)/);
 const {monthBoundaryLabel}=await import('../src/features/when-we-meet/month-boundary.mjs');
 assert.equal(monthBoundaryLabel('2026-09-30',undefined),'Sep');
 assert.equal(monthBoundaryLabel('2026-10-01','2026-09-30'),'Oct');
 assert.equal(monthBoundaryLabel('2026-10-02','2026-10-01'),'');
 assert.equal(monthBoundaryLabel('2027-01-01','2026-12-31'),'Jan 2027');
});
test('mobile room tab bar spacing is identical for every panel (no :has panel-dependent margin → no jump on switch)',()=>{
 const all=['week-calendar.css','when-we-meet.css','room-toolbar.css','people-panel.css','confirmation-panel.css','calendar-fill.css'].map(file=>readFileSync(new URL(`../src/features/when-we-meet/${file}`,import.meta.url),'utf8')).join('\n');
 assert.doesNotMatch(all,/wwm-view-switch:has\(/);
 assert.match(css,/@media\(max-width:600px\)\{\.wwm\.wwm-room \.wwm-tab-panel \.wwm-calendar-heading\{margin-top:0\}\}/);
});
