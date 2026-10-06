import test from 'node:test';
import assert from 'node:assert/strict';
import {
  confirmDateMeeting,
  editDateMeeting,
  resendDateMeeting,
} from '../src/features/when-we-meet/date-confirmation-flow.mjs';
import {
  validateDateConfirmation,
  buildDateCalendarInsert,
  dateConfirmationEventId,
} from '../src/features/when-we-meet/date-confirmation.mjs';
const roomId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const room = {
  id: roomId,
  scheduleMode: 'date',
  startDate: '2024-02-28',
  endDate: '2024-03-02',
  startTime: null,
  endTime: null,
  timezone: 'Asia/Seoul',
};
const previous = validateDateConfirmation(
  { roomId, date: '2024-02-29', title: 'Before', revision: 1, recipients: [userId] },
  room,
  [{ userId, email: 'A@example.com' }],
);
const valid = validateDateConfirmation(
  {
    roomId,
    date: '2024-03-01',
    title: 'After',
    revision: 2,
    recipients: [userId],
    optional: [userId],
  },
  room,
  [{ userId, email: 'A@example.com' }],
);
const eventId = dateConfirmationEventId(roomId, 1);
const event = (v = valid) => ({
  ...buildDateCalendarInsert(v),
  id: eventId,
  etag: '"v1"',
  sequence: 4,
  htmlLink: 'https://calendar.example/event',
});
const rejection = (status, definite = true) =>
  Object.assign(new Error('private A@example.com'), { status, definite });
function harness({
  claim = 'reserved',
  reads = [null, event()],
  insertError,
  patchError,
  finish,
  readError,
} = {}) {
  const calls = [];
  let n = 0;
  return {
    calls,
    reserve: async () => {
      calls.push(['reserve']);
      return claim;
    },
    getEvent: async (id) => {
      calls.push(['get', id]);
      if (readError) throw readError;
      return reads[Math.min(n++, reads.length - 1)];
    },
    insertEvent: async (body) => {
      calls.push(['insert', body]);
      if (insertError) throw insertError;
      return event();
    },
    patchEvent: async (id, body, etag) => {
      calls.push(['patch', id, body, etag]);
      if (patchError) throw patchError;
      return event();
    },
    finalize: async (status, url) => {
      calls.push(['finalize', status, url]);
      if (finish instanceof Error) throw finish;
      return finish ?? status;
    },
  };
}
const run = (fn, d, extra = {}) => fn({ valid, previous, eventId, ...d, ...extra });
const writes = (d) => d.calls.filter((c) => ['insert', 'patch'].includes(c[0]));
test('initial reserve/get/insert/get/finalize uses civil payload and root ID', async () => {
  const d = harness();
  assert.deepEqual(await run(confirmDateMeeting, d), {
    status: 'confirmed',
    url: event().htmlLink,
  });
  assert.deepEqual(
    d.calls.map((c) => c[0]),
    ['reserve', 'get', 'insert', 'get', 'finalize'],
  );
  assert.deepEqual(writes(d)[0][1], { ...buildDateCalendarInsert(valid), id: eventId });
});
for (const claim of ['reserved', 'reserved_reconcile_required'])
  test(`initial fresh ${claim} can insert exactly once`, async () => {
    const d = harness({ claim });
    assert.equal((await run(confirmDateMeeting, d)).status, 'confirmed');
    assert.equal(writes(d).length, 1);
  });
for (const claim of ['reconcile', 'existing'])
  test(`initial ${claim} reads matching persisted event without write`, async () => {
    const d = harness({ claim, reads: [event()] });
    assert.equal((await run(confirmDateMeeting, d)).status, 'confirmed');
    assert.equal(writes(d).length, 0);
  });
for (const claim of ['reconcile', 'existing', 'unexpected'])
  test(`initial ${claim} null cannot create`, async () => {
    const d = harness({ claim, reads: [null] });
    assert.equal((await run(confirmDateMeeting, d)).status, 'reconciling');
    assert.equal(writes(d).length, 0);
  });
test('conflict does not call Calendar', async () => {
  const d = harness({ claim: 'conflict' });
  assert.equal((await run(confirmDateMeeting, d)).status, 'conflict');
  assert.deepEqual(d.calls, [['reserve']]);
});
for (const status of [400, 401, 403, 404, 410, 412, 422])
  test(`strict insert rejection ${status} releases without PII`, async () => {
    const d = harness({ insertError: rejection(status) });
    const r = await run(confirmDateMeeting, d);
    assert.equal(r.status, 'failed');
    assert.equal(d.calls.at(-1)[1], 'released');
    assert.ok(!JSON.stringify(r).includes('A@example.com'));
  });
for (const error of [
  rejection(408),
  rejection(429),
  rejection(500),
  rejection(undefined),
  rejection(400, false),
])
  test(`ambiguous insert ${error.status}/${error.definite} stays reconciling`, async () => {
    const d = harness({ insertError: error });
    assert.equal((await run(confirmDateMeeting, d)).status, 'reconciling');
    assert.equal(d.calls.at(-1)[1], 'reconciling');
    assert.equal(writes(d).length, 1);
  });
test('409 insert always gets exact event before success', async () => {
  const d = harness({ insertError: rejection(409) });
  assert.equal((await run(confirmDateMeeting, d)).status, 'confirmed');
  assert.equal(d.calls.filter((c) => c[0] === 'get').length, 2);
});
for (const error of [rejection(404), new Error('timeout')])
  test(`GET error ${error.status} never inserts`, async () => {
    const d = harness({ readError: error });
    assert.equal((await run(confirmDateMeeting, d)).status, 'reconciling');
    assert.equal(writes(d).length, 0);
  });
const corruptions = {
  wrongId: (e) => ({ ...e, id: 'abcde' }),
  invalidDate: (e) => ({ ...e, start: { date: '2024-02-30' } }),
  dateTime: (e) => ({ ...e, start: { ...e.start, dateTime: undefined } }),
  timeZone: (e) => ({ ...e, end: { ...e.end, timeZone: 'UTC' } }),
  missingGuests: (e) => ({ ...e, attendees: undefined }),
  extraGuest: (e) => ({
    ...e,
    attendees: [...e.attendees, { email: 'owner@example.com', organizer: true }],
  }),
  optional: (e) => ({ ...e, attendees: [{ email: 'A@example.com' }] }),
  privacy: (e) => ({ ...e, guestsCanModify: true }),
  missingPrivacy: (e) => ({ ...e, guestsCanInviteOthers: undefined }),
  cancelled: (e) => ({ ...e, status: 'cancelled' }),
  omitted: (e) => ({ ...e, attendeesOmitted: true }),
};
for (const [name, corrupt] of Object.entries(corruptions))
  for (const [label, fn] of [
    ['confirm', confirmDateMeeting],
    ['edit', editDateMeeting],
    ['resend', resendDateMeeting],
  ])
    test(`${label} rejects ${name} readback without write`, async () => {
      const d = harness({ claim: 'reconcile', reads: [corrupt(event())] });
      if (label === 'resend') d.reserve = async () => 'reserved';
      assert.equal((await run(fn, d)).status, label === 'resend' ? 'unknown' : 'reconciling');
      assert.equal(writes(d).length, 0);
      assert.ok(!d.calls.some((c) => c[0] === 'finalize' && ['confirmed', 'sent'].includes(c[1])));
    });
test('case-insensitive guest readback confirms', async () => {
  const e = event();
  e.attendees[0].email = 'a@EXAMPLE.com';
  const d = harness({ reads: [e] });
  assert.equal((await run(confirmDateMeeting, d)).status, 'confirmed');
});
test('edit reads previous, conditionally patches same root, then reads desired', async () => {
  const old = event(previous);
  old.attendees[0].responseStatus = 'accepted';
  const d = harness({ reads: [old, event()] });
  assert.equal((await run(editDateMeeting, d)).status, 'confirmed');
  assert.equal(writes(d).length, 1);
  const [, id, body, etag] = writes(d)[0];
  assert.equal(id, eventId);
  assert.equal(etag, old.etag);
  assert.equal(body.id, undefined);
  assert.deepEqual(body.start, { date: valid.startDate });
  assert.equal(body.attendees[0].responseStatus, 'accepted');
  assert.equal(body.guestsCanModify, false);
});
test('edit already applied avoids second notification', async () => {
  const d = harness({ claim: 'reconcile', reads: [event()] });
  assert.equal((await run(editDateMeeting, d)).status, 'confirmed');
  assert.equal(writes(d).length, 0);
});
for (const claim of ['conflict', 'not_confirmed'])
  test(`edit ${claim} stops`, async () => {
    const d = harness({ claim });
    assert.equal((await run(editDateMeeting, d)).status, claim);
    assert.equal(writes(d).length, 0);
  });
for (const value of [
  null,
  { ...event(previous), etag: undefined },
  { ...event(previous), summary: 'Third party change' },
])
  test(`edit unsafe baseline ${JSON.stringify(value?.summary)} no PATCH`, async () => {
    const d = harness({ reads: [value] });
    assert.equal((await run(editDateMeeting, d)).status, 'reconciling');
    assert.equal(writes(d).length, 0);
  });
for (const status of [400, 403, 412])
  test(`edit definite ${status} reverts only after verified old readback`, async () => {
    const d = harness({ reads: [event(previous)], patchError: rejection(status) });
    assert.equal((await run(editDateMeeting, d)).status, 'failed');
    assert.equal(d.calls.at(-1)[1], 'reverted');
    assert.equal(d.calls.filter((c) => c[0] === 'get').length, 2);
  });
test('edit rejected but old state disappeared cannot revert', async () => {
  const d = harness({ reads: [event(previous), null], patchError: rejection(412) });
  assert.equal((await run(editDateMeeting, d)).status, 'reconciling');
  assert.equal(d.calls.at(-1)[1], 'reconciling');
});
test('edit ambiguous PATCH cannot retry', async () => {
  const d = harness({ reads: [event(previous)], patchError: new Error('timeout') });
  assert.equal((await run(editDateMeeting, d)).status, 'reconciling');
  assert.equal(writes(d).length, 1);
});
test('edit post-PATCH stale readback cannot confirm', async () => {
  const d = harness({ reads: [event(previous)] });
  assert.equal((await run(editDateMeeting, d)).status, 'reconciling');
});
test('resend verifies frozen snapshot then sequence-only ETag PATCH and readback', async () => {
  const d = harness({ reads: [event(), { ...event(), sequence: 5 }] });
  assert.deepEqual(await run(resendDateMeeting, d), { status: 'sent' });
  assert.deepEqual(writes(d), [['patch', eventId, { sequence: 5 }, '"v1"']]);
  assert.equal(d.calls.filter((c) => c[0] === 'get').length, 2);
});
for (const claim of ['too_soon', 'not_confirmed', 'reconcile'])
  test(`resend ${claim} never notifies`, async () => {
    const d = harness({ claim });
    assert.equal(
      (await run(resendDateMeeting, d)).status,
      claim === 'too_soon' ? 'too_soon' : 'not_confirmed',
    );
    assert.equal(writes(d).length, 0);
  });
for (const e of [
  null,
  { ...event(), etag: undefined },
  { ...event(), sequence: Number.MAX_SAFE_INTEGER },
])
  test('resend missing or unsafe event fails closed', async () => {
    const d = harness({ reads: [e] });
    assert.equal((await run(resendDateMeeting, d)).status, 'unknown');
    assert.equal(writes(d).length, 0);
  });
test('resend definite rejection marks failed without leaking error', async () => {
  const d = harness({ reads: [event()], patchError: rejection(403) });
  assert.equal((await run(resendDateMeeting, d)).status, 'failed');
  assert.equal(d.calls.at(-1)[1], 'failed');
});
test('resend timeout retains reservation', async () => {
  const d = harness({ reads: [event()], patchError: new Error('timeout') });
  assert.equal((await run(resendDateMeeting, d)).status, 'unknown');
  assert.ok(!d.calls.some((c) => c[0] === 'finalize'));
});
test('resend stale sequence is unknown', async () => {
  const d = harness({ reads: [event()] });
  assert.equal((await run(resendDateMeeting, d)).status, 'unknown');
});
for (const [label, fn, reads] of [
  ['confirm', confirmDateMeeting, [event()]],
  ['edit', editDateMeeting, [event()]],
  ['resend', resendDateMeeting, [event(), { ...event(), sequence: 5 }]],
])
  for (const finish of ['conflict', undefined, new Error('database unavailable')])
    test(`${label} finalizer ${String(finish)} never fakes persistence`, async () => {
      const d = harness({ reads, finish: finish === undefined ? '' : finish });
      assert.equal((await run(fn, d)).status, label === 'resend' ? 'unknown' : 'reconciling');
    });
for (const eventId of ['bad!', '', null, 'ABCDEF'])
  test(`invalid event ID ${eventId} stops before dependencies`, async () => {
    const d = harness();
    await assert.rejects(
      run(confirmDateMeeting, d, { eventId }),
      /Invalid date confirmation flow input/,
    );
    assert.deepEqual(d.calls, []);
  });
for (const fn of [confirmDateMeeting, editDateMeeting, resendDateMeeting])
  test(`${fn.name} invalid snapshot rejects generically before reserve`, async () => {
    const d = harness();
    await assert.rejects(run(fn, d, { valid: null }), /Invalid date confirmation flow input/);
    assert.deepEqual(d.calls, []);
  });
for (const [name, corrupt] of Object.entries(corruptions))
  test(`initial post-insert ${name} fails closed`, async () => {
    const d = harness({ reads: [null, corrupt(event())] });
    assert.equal((await run(confirmDateMeeting, d)).status, 'reconciling');
    assert.equal(writes(d).length, 1);
    assert.equal(d.calls.at(-1)[1], 'reconciling');
  });
for (const [name, corrupt] of Object.entries(corruptions))
  test(`edit post-PATCH ${name} fails closed`, async () => {
    const d = harness({ reads: [event(previous), corrupt(event())] });
    assert.equal((await run(editDateMeeting, d)).status, 'reconciling');
    assert.equal(writes(d).length, 1);
    assert.equal(d.calls.at(-1)[1], 'reconciling');
  });
for (const [name, corrupt] of Object.entries(corruptions))
  test(`resend post-PATCH ${name} fails closed`, async () => {
    const d = harness({ reads: [event(), corrupt({ ...event(), sequence: 5 })] });
    assert.equal((await run(resendDateMeeting, d)).status, 'unknown');
    assert.equal(writes(d).length, 1);
    assert.ok(!d.calls.some((c) => c[0] === 'finalize'));
  });
test('durable previous timezone and recipients do not depend on current room', async () => {
  const stored = { ...previous, timezone: 'America/New_York' };
  const d = harness({ reads: [event(stored), event()] });
  assert.equal((await run(editDateMeeting, d, { previous: stored })).status, 'confirmed');
});
test('required attendee edit drops former optional flag', async () => {
  const desired = { ...valid, recipients: previous.recipients };
  const old = { ...previous, recipients: valid.recipients };
  const d = harness({ reads: [event(old), event(desired)] });
  assert.equal(
    (await run(editDateMeeting, d, { previous: old, valid: desired })).status,
    'confirmed',
  );
  assert.equal(writes(d)[0][2].attendees[0].optional, undefined);
});
test('409 insert with absent readback never releases or confirms', async () => {
  const d = harness({ reads: [null], insertError: rejection(409) });
  assert.equal((await run(confirmDateMeeting, d)).status, 'reconciling');
  assert.equal(d.calls.at(-1)[1], 'reconciling');
});
for (const status of [408, 409, 429, 500])
  test(`edit PATCH ${status} never reverts`, async () => {
    const d = harness({ reads: [event(previous)], patchError: rejection(status) });
    assert.equal((await run(editDateMeeting, d)).status, 'reconciling');
    assert.equal(d.calls.at(-1)[1], 'reconciling');
  });
for (const status of [408, 409, 429, 500])
  test(`resend PATCH ${status} retains reservation`, async () => {
    const d = harness({ reads: [event()], patchError: rejection(status) });
    assert.equal((await run(resendDateMeeting, d)).status, 'unknown');
    assert.ok(!d.calls.some((c) => c[0] === 'finalize'));
  });
for (const fn of [confirmDateMeeting, editDateMeeting, resendDateMeeting])
  test(`${fn.name} reserve rejection propagates before Calendar`, async () => {
    const d = harness();
    d.reserve = async () => {
      throw new Error('claim rejected');
    };
    await assert.rejects(run(fn, d), /claim rejected/);
    assert.deepEqual(d.calls, []);
  });
