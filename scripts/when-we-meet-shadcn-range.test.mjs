import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/DateRangePicker.tsx',import.meta.url),'utf8');
test('range picker composes the installed Calendar and Popover rather than a custom grid',()=>{
 assert.match(source,/from ['"]@\/components\/ui\/calendar['"]/);
 assert.match(source,/from ['"]@\/components\/ui\/popover['"]/);
 assert.match(source,/<Calendar\s+mode="range"/);
 assert.match(source,/<PopoverContent/);
 assert.doesNotMatch(source,/calendarDays|moveCalendarDate|role="gridcell"|AnimatePresence/);
});
test('popup bounds native scroll on a short viewport without footer actions',()=>{
 const css=readFileSync(new URL('../src/features/when-we-meet/date-range-picker.css',import.meta.url),'utf8');
 assert.match(css,/\.wwm-range-popover[^{}]*\{[^}]*max-height:[^;]*dvh/);
 assert.match(css,/\.wwm-range-popover[^{}]*\{[^}]*overflow-y:auto/);
 assert.doesNotMatch(source,/className="wwm-range-actions"/);
});
