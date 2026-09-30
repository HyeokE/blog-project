import test from 'node:test';
import assert from 'node:assert/strict';
import { validTimeOptions, initialTimeFocus } from '../src/features/when-we-meet/time-options.mjs';

test('all half-hours remain available for a start time', () => {
  const options = validTimeOptions();
  assert.equal(options.length, 48);
  assert.deepEqual([options[0], options.at(-1)], ['00:00', '23:30']);
});
test('end choices are strictly later than start and obey inclusive bounds', () => {
  // End choices include the end-of-day boundary 24:00; start choices (no minTime) never do.
  assert.deepEqual(validTimeOptions({ minTime: '22:30' }), ['23:00', '23:30', '24:00']);
  assert.deepEqual(validTimeOptions({ min: '09:00', max: '10:00' }), ['09:00', '09:30', '10:00']);
  assert.deepEqual(validTimeOptions({ minTime: '23:30' }), ['24:00']);
  assert.ok(!validTimeOptions().includes('24:00'));
  assert.ok(validTimeOptions({ minTime: '12:00' }).every(time => time > '12:00'));
});
test('opening focuses selected valid time or first available, without fabricating a selection', () => {
  const choices = validTimeOptions({ minTime: '09:00' });
  assert.equal(initialTimeFocus(choices, '10:30'), '10:30');
  assert.equal(initialTimeFocus(choices, '09:00'), '09:30');
  assert.equal(initialTimeFocus(choices, ''), '09:30');
  assert.equal(initialTimeFocus([], '23:30'), '');
});
