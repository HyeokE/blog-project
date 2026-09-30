import assert from 'node:assert/strict';
import test from 'node:test';
import { timezoneOptions, searchTimezones, isValidTimezone, timezoneOffset } from '../src/features/when-we-meet/timezone-options.mjs';

test('canonical IANA selection and fallback are valid', () => {
  assert.ok(timezoneOptions().includes('Asia/Seoul'));
  assert.ok(timezoneOptions().includes('UTC'));
  assert.equal(isValidTimezone('Asia/Seoul'), true);
  assert.equal(isValidTimezone('Seoul'), false);
  assert.equal(isValidTimezone('Mars/Olympus'), false);
  assert.deepEqual(timezoneOptions({ supportedValuesOf() { throw Error('unsupported'); } }), ['UTC', 'Asia/Seoul']);
});
test('search city, canonical zone, and Korean alias without storing aliases', () => {
  for (const query of ['Seoul', 'asia/seoul', '서울']) assert.ok(searchTimezones(query).includes('Asia/Seoul'));
  assert.deepEqual(searchTimezones('impossible-zone-12345'), []);
});
test('offset follows selected calendar date across daylight saving boundaries', () => {
  assert.equal(timezoneOffset('America/New_York', '2026-01-15'), 'UTC−05:00');
  assert.equal(timezoneOffset('America/New_York', '2026-07-15'), 'UTC−04:00');
  assert.equal(timezoneOffset('Asia/Seoul', '2026-07-15'), 'UTC+09:00');
});

test('opening the list centers the selected option; arrow keys only scroll the minimum',async()=>{
 const {revealScrollDelta}=await import('../src/features/when-we-meet/timezone-options.mjs');
 const view={top:100,height:280};
 // Asia/Seoul far below the fold (e.g. 6000px down): centered on open.
 assert.equal(revealScrollDelta({top:6100,height:44},view,'center'),6100-100-(280-44)/2);
 // Already visible: nearest does nothing.
 assert.equal(revealScrollDelta({top:150,height:44},view,'nearest'),0);
 // Below / above the viewport: nearest aligns the matching edge.
 assert.equal(revealScrollDelta({top:370,height:44},view,'nearest'),370+44-(100+280));
 assert.equal(revealScrollDelta({top:80,height:44},view,'nearest'),-20);
 const source=(await import('node:fs')).readFileSync(new URL('../src/features/when-we-meet/TimezoneCombobox.tsx',import.meta.url),'utf8');
 assert.match(source,/revealScrollDelta\(option\.getBoundingClientRect\(\), viewport\.getBoundingClientRect\(\), mode\)/);assert.match(source,/revealActive\(resultsRef\.current, 'center'\)/);
 assert.doesNotMatch(source,/scrollIntoView/);
});
