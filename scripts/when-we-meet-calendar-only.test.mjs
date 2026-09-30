import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isRangeEndDisabled,selectRangeDate} from '../src/features/when-we-meet/range.mjs';
const source=readFileSync(new URL('../src/features/when-we-meet/DateRangePicker.tsx',import.meta.url),'utf8');
test('popup auto-commits completed range without action footer or visible guidance',()=>{
 assert.match(source,/<Calendar mode="range"/);
 assert.doesNotMatch(source,/wwm-range-actions|>Reset<\/button>|>Cancel<\/button>|>Apply<\/button>|Apply to save/);
 assert.match(source,/onChange\(next\.start,next\.end\)/);
 assert.match(source,/setOpen\(false\)/);
 assert.doesNotMatch(source,/wwm-range-summary|wwm-range-feedback|Dates · up to 14 days| · \$\{rangeDays\(start,end\)\} days/);
 assert.match(source,/className="sr-only"/);
 assert.match(source,/isRangeEndDisabled\(draft/);
});
test('only end phase disables beyond 14 inclusive days, never earlier restart dates',()=>{
 const pending={start:'2026-09-29',end:'',phase:'end',error:''};
 assert.equal(isRangeEndDisabled(pending,'2026-10-12'),false);
 assert.equal(isRangeEndDisabled(pending,'2026-10-13'),true);
 assert.equal(isRangeEndDisabled(pending,'2026-09-28'),false);
 assert.equal(isRangeEndDisabled({...pending,phase:'start'},'2026-10-13'),false);
 assert.equal(isRangeEndDisabled({...pending,phase:'complete'},'2026-10-13'),false);
 assert.equal(selectRangeDate(pending,'2026-10-13').start,pending.start);
});
