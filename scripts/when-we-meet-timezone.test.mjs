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
