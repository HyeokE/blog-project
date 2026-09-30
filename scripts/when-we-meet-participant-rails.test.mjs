import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../src/features/when-we-meet/',import.meta.url);
test('other respondents render narrow independent duration rails instead of labeled cards',()=>{
 const source=readFileSync(new URL('WeeklyAvailability.tsx',root),'utf8');
 assert.match(source,/wwm-participant-rail/);
 assert.match(source,/left:readOnly\?/);
 // Edit-view rails divide the participant gutter (≤40% of the column) by lane, so they never spill into the next day.
 assert.match(source,/:`\$\{block\.lane\/railLanes\*100\}%`/);
 assert.match(source,/width:readOnly\?.*:`calc\(\$\{100\/railLanes\}% - 4px\)`/);
 assert.match(source,/'--participant-gutter':`min\(\$\{participantGutter\}px, 40%\)`/);
 assert.match(source,/<strong>\{block.label\}<\/strong>/);
 assert.match(source,/aria-label=\{t\('grid\.blockName',\{name:block\.label/);
});
test('participant rails occupy a separate left gutter from own editing',()=>{
 const css=readFileSync(new URL('week-calendar.css',root),'utf8');
 assert.match(css,/\.wwm-calendar-events\{[^}]*left:4px/);
 assert.match(css,/\.wwm-calendar-selection\{[^}]*left:calc\(var\(--participant-gutter\)/);
 assert.match(css,/border:1px solid var\(--rail-color\)/);
 assert.match(css,/background:var\(--rail-color\)/);
 assert.match(css,/--rail-color:color-mix\(in srgb,var\(--event-color\) 55%,var\(--calendar-surface\)\)/);
});
