import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/DateRangePicker.tsx',import.meta.url),'utf8');
test('reference picker has one responsive calendar with an icon trigger and scoped range styling',()=>{
 assert.match(source,/CalendarDays/);
 assert.match(source,/numberOfMonths=\{months\}/);
 assert.match(source,/matchMedia/);
 assert.match(source,/className="wwm-range-calendar"/);
 assert.match(source,/\.\/date-range-picker\.css/);
});
