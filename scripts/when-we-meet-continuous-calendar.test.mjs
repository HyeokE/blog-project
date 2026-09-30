import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
test('calendar renders the full date range without seven-day paging',()=>{
 assert.ok(!source.includes('weekWindow('),'no week window truncation');
 assert.ok(source.includes('calendarRows(dates,slots)'));
 assert.ok(source.includes("'--wwm-day-count':dates.length"));
 assert.ok(!source.includes('Next week'));
});
