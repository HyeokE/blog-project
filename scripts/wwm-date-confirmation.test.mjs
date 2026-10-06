import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateDateConfirmation as validate,
  buildDateCalendarInsert as build,
  dateConfirmationFingerprint as hash,
  dateConfirmationEventId as eventId,
  matchesDateCalendarEvent as matches,
} from '../src/features/when-we-meet/date-confirmation.mjs';
import { confirmationEventId } from '../src/features/when-we-meet/confirmation-foundation.mjs';
const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
];
const room = {
  id: ids[0],
  scheduleMode: 'date',
  startDate: '2024-02-28',
  endDate: '2024-03-02',
  startTime: null,
  endTime: null,
  timezone: 'Asia/Seoul',
};
const members = [
  { userId: ids[1], email: ' A@example.com ', displayName: 'Private' },
  { userId: ids[2], email: 'b@example.com' },
  { userId: ids[3], email: null },
];
const proposal = {
  roomId: room.id,
  date: '2024-02-29',
  title: '  Meeting  ',
  revision: 1,
  recipients: [ids[2], ids[1]],
  excluded: [ids[3]],
  optional: [ids[2]],
};
const valid = () => validate(proposal, room, members);
const rejects = (p = {}, r = {}, m = members) =>
  assert.throws(
    () => validate({ ...proposal, ...p }, { ...room, ...r }, m),
    (e) => e instanceof Error && e.message === 'Invalid date confirmation snapshot',
  );
test('canonical snapshot is detached, deeply frozen, and excludes unrelated PII', () => {
  const before = JSON.stringify({ proposal, room, members }),
    v = valid();
  assert.deepEqual(v, {
    scheduleMode: 'date',
    roomId: room.id,
    date: proposal.date,
    startDate: proposal.date,
    endDate: '2024-03-01',
    timezone: room.timezone,
    title: 'Meeting',
    revision: 1,
    recipients: [
      { userId: ids[1], email: 'A@example.com', optional: false },
      { userId: ids[2], email: 'b@example.com', optional: true },
    ],
    excluded: [ids[3]],
  });
  for (const o of [v, v.recipients, v.recipients[0], v.excluded])
    assert.equal(Object.isFrozen(o), true);
  assert.throws(() => {
    v.recipients[0].email = 'changed';
  });
  assert.equal(JSON.stringify({ proposal, room, members }), before);
});
for (const [date, end] of [
  ['0001-01-01', '0001-01-02'],
  ['2024-02-29', '2024-03-01'],
  ['2025-02-28', '2025-03-01'],
  ['2026-12-31', '2027-01-01'],
  ['9999-12-30', '9999-12-31'],
  ['2026-03-08', '2026-03-09'],
  ['2026-11-01', '2026-11-02'],
])
  test(`civil exclusive end ${date} never moves across zones`, () => {
    for (const timezone of ['Asia/Seoul', 'America/New_York', 'Pacific/Kiritimati', 'UTC'])
      assert.equal(
        validate(
          { ...proposal, date },
          { ...room, startDate: date, endDate: date, timezone },
          members,
        ).endDate,
        end,
      );
  });
for (const date of [
  '2024-02-30',
  '0000-01-01',
  '10000-01-01',
  Infinity,
  null,
  '2024-02-27',
  '2024-03-03',
])
  test(`reject invalid/outside date ${date}`, () => rejects({ date }));
test('reject exclusive-end overflow', () =>
  rejects({ date: '9999-12-31' }, { startDate: '9999-12-31', endDate: '9999-12-31' }));
for (const r of [
  { scheduleMode: 'time' },
  { scheduleMode: undefined },
  { startTime: '00:00' },
  { endTime: undefined },
  { id: 'bad' },
  { startDate: '2024-03-03' },
  { endDate: '2024-02-30' },
  { endDate: '2024-03-27' },
  { timezone: 'Mars/Olympus' },
  { timezone: '+09:00' },
  { timezone: undefined },
])
  test(`reject room ${JSON.stringify(r)}`, () => rejects({}, r));
for (const p of [
  { roomId: ids[1] },
  { revision: 0 },
  { revision: 1.5 },
  { revision: Infinity },
  { revision: Number.MAX_SAFE_INTEGER + 1 },
  { title: '' },
  { title: ' ' },
  { title: 'x'.repeat(101) },
  { title: 'x\ny' },
  { title: 'x\u007f' },
  { title: null },
])
  test(`reject proposal ${JSON.stringify(p)}`, () => rejects(p));
test('trimmed title length is the bound', () =>
  assert.equal(
    validate({ ...proposal, title: ' ' + 'x'.repeat(100) + ' ' }, room, members).title.length,
    100,
  ));
for (const key of ['start', 'end', 'dateTime', 'startTime', 'endTime', 'timeZone', 'interval'])
  test(`reject mixed instant field ${key}`, () => rejects({ [key]: undefined }));
test('supplied civil bounds must exactly match computed bounds', () => {
  assert.equal(
    validate({ ...proposal, startDate: proposal.date, endDate: '2024-03-01' }, room, members)
      .endDate,
    '2024-03-01',
  );
  rejects({ startDate: '2024-02-28' });
  rejects({ endDate: proposal.date });
  rejects({ startDate: undefined });
});
for (const p of [
  { recipients: [] },
  { recipients: [ids[1], ids[1]] },
  { recipients: [ids[0], ids[1]] },
  { recipients: [ids[1]] },
  { excluded: [ids[1]] },
  { excluded: [ids[3], ids[3]] },
  { excluded: [ids[0]] },
  { excluded: null },
  { recipients: null },
  { optional: null },
  { optional: [ids[3]] },
  { optional: [ids[1], ids[1]] },
])
  test(`reject partition ${JSON.stringify(p)}`, () => rejects(p));
test('reject actual sparse optional bypass', () => rejects({ optional: Array(1) }));
test('reject actual sparse roster with undefined excluded bypass', () => {
  const roster = [members[0], ,];
  rejects({ recipients: [ids[1]], excluded: [undefined], optional: [] }, {}, roster);
});

for (const field of ['members', 'recipients', 'excluded', 'optional']) {
  for (const kind of ['hole', 'inherited index', 'undefined', 'null', 'non-UUID']) {
    test(`reject ${field} ${kind} entry`, () => {
      const list = field === 'members' ? [...members] : [...proposal[field]];
      if (kind === 'hole' || kind === 'inherited index') {
        const value = list[0];
        delete list[0];
        if (kind === 'inherited index') {
          const prototype = Object.create(Array.prototype);
          Object.defineProperty(prototype, '0', { value, configurable: true });
          Object.setPrototypeOf(list, prototype);
        }
      } else {
        const value = kind === 'undefined' ? undefined : kind === 'null' ? null : 'not-a-UUID';
        list[0] =
          field === 'members' && kind === 'non-UUID' ? { ...members[0], userId: value } : value;
      }
      if (field === 'members') rejects({}, {}, list);
      else rejects({ [field]: list });
    });
  }
  test(`reject ${field} arbitrary iterable`, () => {
    const value = new Set(field === 'members' ? members : proposal[field]);
    if (field === 'members') rejects({}, {}, value);
    else rejects({ [field]: value });
  });
}
test('explicit undefined lists do not use absent-field defaults', () => {
  for (const field of ['recipients', 'excluded', 'optional']) rejects({ [field]: undefined });
});
test('dense lists preserve canonical frozen output and empty or absent defaults', () => {
  for (const extras of [{ excluded: [], optional: [] }, {}]) {
    const v = validate(
      {
        roomId: room.id,
        date: proposal.date,
        title: proposal.title,
        revision: 1,
        recipients: [ids[2], ids[1]],
        ...extras,
      },
      room,
      [members[1], members[0]],
    );
    assert.deepEqual(v.excluded, []);
    assert.deepEqual(v.recipients, [
      { userId: ids[1], email: 'A@example.com', optional: false },
      { userId: ids[2], email: 'b@example.com', optional: false },
    ]);
    for (const value of [v, v.recipients, v.excluded, ...v.recipients])
      assert.equal(Object.isFrozen(value), true);
    assert.equal(
      v.recipients.every(({ userId }) => typeof userId === 'string'),
      true,
    );
    assert.equal(
      v.excluded.every((id) => typeof id === 'string'),
      true,
    );
  }
  const v = valid();
  assert.deepEqual(v.excluded, [ids[3]]);
  assert.equal(
    v.excluded.every((id) => typeof id === 'string'),
    true,
  );
});
test('authoritative roster rejects malformed IDs and duplicates', () => {
  rejects({}, {}, []);
  rejects({}, {}, null);
  rejects({}, {}, [...members, members[0]]);
  rejects({}, {}, [{ ...members[0], userId: 'bad' }, ...members.slice(1)]);
  rejects({}, {}, [null]);
});
for (const email of [
  null,
  'bad',
  'a@@example.com',
  'a b@example.com',
  'a@example.com\nBcc:x@y.com',
  'a@example.com\u007f',
])
  test(`reject selected email ${JSON.stringify(email)}`, () =>
    rejects({}, {}, [{ ...members[0], email }, ...members.slice(1)]));
test('selected email uniqueness is case insensitive and browser emails are ignored', () => {
  rejects({}, {}, [members[0], { ...members[1], email: 'a@EXAMPLE.com' }, members[2]]);
  assert.equal(
    validate({ ...proposal, emails: ['evil@example.com'] }, room, members).recipients[0].email,
    'A@example.com',
  );
});
test('fingerprint ignores ordering and unrelated keys but protects every meaningful field', () => {
  const v = valid(),
    h = hash(v);
  assert.match(h, /^[a-f0-9]{64}$/);
  assert.equal(hash({ ...v, recipients: [...v.recipients].reverse(), displayName: 'Private' }), h);
  assert.equal(
    hash(
      validate(
        { ...proposal, recipients: [...proposal.recipients].reverse() },
        room,
        [...members].reverse(),
      ),
    ),
    h,
  );
  assert.equal(
    hash({ ...v, excluded: [ids[3], ids[0]] }),
    hash({ ...v, excluded: [ids[0], ids[3]] }),
  );
  for (const patch of [
    { scheduleMode: 'time' },
    { roomId: ids[1] },
    { date: '2024-03-01' },
    { startDate: '2024-03-01' },
    { endDate: '2024-03-02' },
    { timezone: 'UTC' },
    { title: 'Other' },
    { revision: 2 },
    { excluded: [] },
    { recipients: v.recipients.slice(1) },
    ...['userId', 'email', 'optional'].map((key) => ({
      recipients: [
        {
          ...v.recipients[0],
          [key]: key === 'optional' ? true : key === 'email' ? 'a@example.com' : ids[3],
        },
        v.recipients[1],
      ],
    })),
  ])
    assert.notEqual(hash({ ...v, ...patch }), h);
});
test('event ID reuses existing deterministic namespace', () => {
  assert.equal(eventId(room.id, 1), confirmationEventId(room.id, 1));
  assert.notEqual(eventId(room.id, 1), eventId(room.id, 2));
  assert.throws(() => eventId('bad', 1));
});
test('payload is date-only and protects guests', () =>
  assert.deepEqual(build(valid()), {
    summary: 'Meeting',
    start: { date: '2024-02-29' },
    end: { date: '2024-03-01' },
    attendees: [{ email: 'A@example.com' }, { email: 'b@example.com', optional: true }],
    guestsCanSeeOtherGuests: false,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
  }));
test('readback accepts exact protected fields, case-insensitive emails, extra RSVP data and independent ID', () => {
  const v = valid(),
    e = build(v);
  assert.equal(matches(e, v), true);
  assert.equal(
    matches(
      {
        ...e,
        id: 'existing-root',
        status: 'confirmed',
        attendees: [
          { email: 'B@EXAMPLE.COM', optional: true, responseStatus: 'accepted', displayName: 'B' },
          { email: 'a@example.com', optional: false, organizer: true, self: true },
        ],
      },
      v,
    ),
    true,
  );
});
for (const patch of [
  null,
  {},
  { status: 'cancelled' },
  { status: 'tentative' },
  { status: 'deleted' },
  { summary: 'Other' },
  { start: { date: '2024-02-28' } },
  { end: { date: '2024-02-29' } },
  { start: { date: '2024-02-29', dateTime: null } },
  { end: { date: '2024-03-01', dateTime: '2024-03-01T00:00:00Z' } },
  { start: { date: '2024-02-29', timeZone: 'UTC' } },
  { attendees: null },
  { attendees: [] },
  { attendees: [null] },
  { attendees: [{ email: 42 }] },
  { attendees: [{ email: 'a@example.com' }, { email: 'b@example.com' }] },
  {
    attendees: [
      { email: 'a@example.com', optional: 'false' },
      { email: 'b@example.com', optional: true },
    ],
  },
  {
    attendees: [
      { email: 'a@example.com' },
      { email: 'b@example.com', optional: true },
      { email: 'A@EXAMPLE.COM' },
    ],
  },
  {
    attendees: [
      { email: 'a@example.com' },
      { email: 'b@example.com', optional: true },
      { email: 'excluded@example.com', organizer: true },
    ],
  },
  { attendeesOmitted: true },
  ...['guestsCanSeeOtherGuests', 'guestsCanInviteOthers', 'guestsCanModify'].flatMap((key) => [
    { [key]: true },
    { [key]: undefined },
  ]),
])
  test(`readback fails closed ${JSON.stringify(patch)}`, () => {
    const v = valid();
    assert.equal(
      matches(patch === null ? null : { ...build(v), ...patch }, v),
      patch !== null && Object.keys(patch).length === 0,
    );
  });
test('malformed readback and malformed snapshots return false without throwing', () => {
  for (const e of [undefined, 1, 'event', [], true]) assert.equal(matches(e, valid()), false);
  for (const v of [null, {}, undefined]) assert.equal(matches({}, v), false);
});
