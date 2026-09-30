import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/features/when-we-meet/when-we-meet.css',import.meta.url),'utf8');
const component=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('room title owns date metadata and save action without redundant headings',()=>{
 assert.doesNotMatch(component,/wwm-eyebrow/);
 assert.match(component,/Save availability<\/Button>/);
 assert.match(component,/\{room\?<p>\{formatCraftDate\(room.start_date\)\}/);
 assert.doesNotMatch(component,/<div className="wwm-heading"><div><h2>시간표<\/h2>/);
});
test('room uses weekly navigation instead of the superseded standalone calendar',()=>{
 const weekly=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
 assert.match(component,/<WeeklyAvailability\b/);
 assert.doesNotMatch(component,/calendarOpen&&<motion\.div/);
 assert.match(weekly,/aria-label="Previous week"/);
 assert.match(weekly,/aria-label="Next week"/);
 assert.match(weekly,/aria-label="Select a day"/);
 assert.match(weekly,/setDetail\(null\)/);
});
test('room tabs present a visible yet restrained transition',()=>{
 assert.match(css,/\.wwm-tab-panel\{animation:wwm-tab-reveal \.22s/);
 assert.match(css,/@keyframes wwm-tab-reveal\{from\{opacity:\.35\}to\{opacity:1\}\}/);
 assert.doesNotMatch(css,/@keyframes wwm-tab-reveal\{[^}]*translateY/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.wwm-tab-panel\{animation:none!important\}\}/);
 assert.doesNotMatch(component,/wwm-active-tab/);
 assert.match(css,/\.wwm \.wwm-view-switch \[data-slot='tabs-trigger'\]::after\{display:none/);
});
test('tab strip avoids transient scrollbars while timetable keeps styled native scrolling',()=>{
 assert.match(css,/\.wwm-view-switch\{overflow:visible/);
 assert.match(css,/\.wwm-scroll,\.wwm-time-options\{scrollbar-width:thin;scrollbar-color:/);
 assert.match(css,/\.wwm-scroll::-webkit-scrollbar\{width:8px;height:8px\}/);
});
test('Craft and WWM bounded surfaces use a scoped four-pixel token',()=>{
 assert.match(css,/--craft-control-radius:4px/);
 assert.match(css,/\.wwm-card[^\n]*border-radius:var\(--craft-control-radius\)/);
 const craft=readFileSync(new URL('../src/app/craft/craft.css',import.meta.url),'utf8');
 assert.match(craft,/--craft-control-radius:4px/);
 assert.match(craft,/\.craft-account-avatar\{width:42px;height:42px;border-radius:50%/);
});
