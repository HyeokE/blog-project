import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const component=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/when-we-meet/week-calendar.css',import.meta.url),'utf8');
test('calendar heading uses short English month names and keeps both years across boundaries',()=>{
 assert.match(component,/new Intl\.DateTimeFormat\('en-US',\{month:'short',year:'numeric',timeZone:'UTC'\}\)/);
 assert.match(component,/lastMonth!==month\?` – \$\{lastMonth\}`:''/);
 const formatter=new Intl.DateTimeFormat('en-US',{month:'short',year:'numeric',timeZone:'UTC'});
 const heading=(start,end)=>{const first=formatter.format(new Date(`${start}T00:00:00Z`));const last=formatter.format(new Date(`${end}T00:00:00Z`));return `${first}${last!==first?` – ${last}`:''}`};
 assert.equal(heading('2026-09-30','2026-10-01'),'Sep 2026 – Oct 2026');
 assert.equal(heading('2026-12-31','2027-01-01'),'Dec 2026 – Jan 2027');
 assert.equal(heading('2026-09-01','2026-09-30'),'Sep 2026');
});
test('mobile room tab bar spacing is identical for every panel (no :has panel-dependent margin → no jump on switch)',()=>{
 const all=['week-calendar.css','when-we-meet.css','room-toolbar.css','people-panel.css','confirmation-panel.css','calendar-fill.css'].map(file=>readFileSync(new URL(`../src/features/when-we-meet/${file}`,import.meta.url),'utf8')).join('\n');
 assert.doesNotMatch(all,/wwm-view-switch:has\(/);
 assert.match(css,/@media\(max-width:600px\)\{\.wwm\.wwm-room \.wwm-tab-panel \.wwm-calendar-heading\{margin-top:0\}\}/);
});
