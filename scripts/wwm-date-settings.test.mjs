import test from 'node:test';
import assert from 'node:assert/strict';
const path = '../src/features/when-we-meet/date-settings.mjs';
const draft = {
  title: ' Meeting ',
  name: ' Me ',
  startDate: '2026-10-01',
  endDate: '2026-10-28',
  timezone: 'Asia/Seoul',
};
const context = {
  room: { startDate: '2026-10-01' },
  baselineName: 'Me',
  now: new Date('2026-10-07T00:00:00Z'),
};
test('valid inclusive 28 days and unchanged historical start', async () => {
  const { validateDateSettings } = await import(path);
  assert.deepEqual(validateDateSettings(draft, context), {});
});
for (const [field, change] of [
  ['dates', { endDate: '2026-10-29' }],
  ['dates', { startDate: '2026-10-02' }],
  ['dates', { startDate: '2026-02-30' }],
  ['timezone', { timezone: 'Mars/Base' }],
  ['timezone', { timezone: ' UTC ' }],
  ['title', { title: 'x'.repeat(101) }],
  ['title', { title: 'bad\n' }],
  ['name', { name: 'x'.repeat(51) }],
  ['name', { name: 'bad\t' }],
  ['name', { name: '' }],
])
  test('invalid ' + field + ' ' + JSON.stringify(change), async () => {
    const { validateDateSettings } = await import(path);
    assert.ok(validateDateSettings({ ...draft, ...change }, context)[field]);
  });
test('future civil dates remain valid without timezone instant shifting', async () => {
  const { validateDateSettings } = await import(path);
  assert.deepEqual(
    validateDateSettings(
      { ...draft, startDate: '2026-10-08', endDate: '2026-10-08', timezone: 'Pacific/Kiritimati' },
      context,
    ),
    {},
  );
});

for (const timezone of ['+09:00', '-05:00', '+0900', '-0500', '+09', '-05', ' +09:00 ', '09:00'])
  test('Settings rejects fixed offset timezone ' + timezone, async () => {
    const { validateDateSettings } = await import(path);
    assert.equal(validateDateSettings({ ...draft, timezone }, context).timezone, 'invalid');
  });
for (const timezone of [
  'Asia/Seoul',
  'UTC',
  'America/New_York',
  'Europe/London',
  'Etc/UTC',
  'Etc/GMT+9',
])
  test('Settings accepts IANA timezone or alias ' + timezone, async () => {
    const { validateDateSettings } = await import(path);
    assert.deepEqual(validateDateSettings({ ...draft, timezone }, context), {});
  });
