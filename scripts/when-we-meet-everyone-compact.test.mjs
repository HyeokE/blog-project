import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {everyoneDayWidth,eventGeometry} from '../src/features/when-we-meet/everyone-geometry.mjs';
const source=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/when-we-meet/week-calendar.css',import.meta.url),'utf8');
test('regular cards fit in 72px lanes and compact lanes retain 16px pitch',()=>{
 assert.equal(everyoneDayWidth([{lanes:15}],false),1088);
 assert.equal(everyoneDayWidth([{lanes:15}],true),248);
 assert.equal(everyoneDayWidth([],false),120);
 assert.deepEqual(eventGeometry({lane:2,lanes:15},false),{left:'calc(13.333333333333334% + 2px)',width:'calc(6.666666666666667% - 4px)'});
 assert.deepEqual(eventGeometry({lane:2,lanes:15},true),{left:32,width:12});
});
test('compact is automatic above six people, switchable, only offered in Everyone, with accessible event details',()=>{
 assert.match(source,/useState<boolean\|null>\(null\)/);assert.match(source,/compactChoice\?\?people\.length>AUTO_COMPACT_PEOPLE/);
 // A quiet Detailed | Compact segmented control in the grid toolbar, only in Everyone.
 assert.match(source,/!selection&&readOnly&&<ToggleGroup type="single"[^>]*className="wwm-segmented" aria-label="Calendar density"/);
 assert.match(source,/value=\{compact\?'compact':'detailed'\}/);
 assert.match(source,/\{mode==='compact'\?'Compact':'Detailed'\}/);
 assert.match(source,/readOnly&&compact\?'wwm-everyone-compact'/);
 assert.match(source,/everyoneDayWidth\(savedBlocks,compact\)/);
 assert.match(source,/eventGeometry\(block,compact,phone\)/);
 assert.match(source,/aria-label=\{`\$\{block.label\}/);
 assert.match(source,/onMouseEnter=\{\(\)=>hoverDetail.open/);
 assert.match(source,/tabIndex=\{-1\}/);
 assert.match(source,/onClick=\{\(\)=>hoverDetail.open/);
 assert.match(source,/readOnly&&!compact\?/);
 assert.match(css,/\.wwm-everyone-compact[^}]*background:var\(--rail-color\)/);
 assert.match(css,/\.wwm-everyone-compact[^}]*border-radius:4px/);
 assert.match(css,/\.wwm-calendar-event strong\{[^}]*text-overflow:ellipsis/);
});
test('phone pager columns: compact rails share the column width instead of overflowing into the next day',()=>{
 assert.deepEqual(eventGeometry({lane:2,lanes:15},true,true),{left:'calc(13.333333333333334% + 1px)',width:'max(2px, calc(6.666666666666667% - 2px))'});
 assert.deepEqual(eventGeometry({lane:0,lanes:2},true,true),{left:0,width:12},'few lanes keep the fixed 16px pitch');
 assert.deepEqual(eventGeometry({lane:2,lanes:15},false,true),eventGeometry({lane:2,lanes:15},false));
});
