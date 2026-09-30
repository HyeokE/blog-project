import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/when-we-meet/week-calendar.css',import.meta.url),'utf8');
test('detail separates identity, date and time without repeated saved copy',()=>{
 for(const cls of ['wwm-detail-person','wwm-detail-date','wwm-detail-time'])assert.ok(source.includes(cls),cls);
 // The timezone is shown once per view (room header meta), not again in each detail.
 assert.ok(!source.includes('wwm-detail-zone'));
 assert.ok(!source.includes('Saved availability ·'));
});
test('detail keeps time on one line and avoids vertical motion',()=>{
 assert.ok(/\.wwm-week-detail \.wwm-detail-time\{[^}]*white-space:nowrap/.test(css));
 assert.ok(/\.wwm-week-detail\{[^}]*animation:none!important/.test(css));
});
