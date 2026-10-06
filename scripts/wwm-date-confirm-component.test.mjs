import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load } from './wwm-date-room-harness.mjs';
import * as helpers from '../src/features/when-we-meet/date-confirm-ui.mjs';
const uid = '22222222-2222-4222-8222-222222222222',
  id = '11111111-1111-4111-8111-111111111111';
const room = {
  id,
  ownerId: uid,
  role: 'ADMIN',
  title: 'Meeting',
  startDate: '2099-01-01',
  endDate: '2099-01-04',
  timezone: 'UTC',
  scheduleMode: 'date',
  startTime: null,
  endTime: null,
};
const attendee = {
  userId: uid,
  displayName: 'Test',
  email: 'test@example.test',
  hasAvailability: true,
};
const walk = (t) =>
  !t || typeof t !== 'object' ? [] : [t, ...[t.props?.children].flat(Infinity).flatMap(walk)];
function harness({
  role = 'ADMIN',
  responses = [],
  send,
  read,
  initial = { status: null, owner: null, review: { attendees: [attendee] } },
} = {}) {
  let account = { user: { id: uid }, loading: false };
  let currentRoom = { ...room, role };
  let index = 0;
  const state = [],
    refs = [],
    effects = [],
    calls = [],
    dependencies = [],
    cleanups = [];
  let ri = 0,
    ei = 0;
  const hooks = {
    ...React,
    useState(v) {
      const i = index++;
      if (!(i in state)) state[i] = typeof v === 'function' ? v() : v;
      return [
        state[i],
        (v) => {
          state[i] = typeof v === 'function' ? v(state[i]) : v;
        },
      ];
    },
    useRef(v) {
      const i = ri++;
      return refs[i] ?? (refs[i] = { current: v });
    },
    useEffect(f, deps) {
      const i = ei++;
      if (!dependencies[i] || deps.some((v, j) => v !== dependencies[i][j])) {
        dependencies[i] = deps;
        effects.push(() => {
          cleanups[i]?.();
          cleanups[i] = f();
        });
      }
    },
    useCallback: (f) => f,
    useMemo: (f) => f(),
  };
  const api = {
    getDateConfirmation: async (...a) => (read ? read(...a) : initial),
    confirmDateMeetingRoute: async (...a) => {
      calls.push(['send', ...JSON.parse(JSON.stringify(a))]);
      return send ? send() : { status: 'confirmed' };
    },
    updateDateMeetingRoute: async (...a) => {
      calls.push(['update', ...a]);
      return { status: 'confirmed' };
    },
    reconcileDateMeetingRoute: async (...a) => {
      calls.push(['check', ...a]);
      return { status: 'reconciling' };
    },
    resendDateMeetingRoute: async (...a) => {
      calls.push(['resend', ...a]);
      return { status: 'sent' };
    },
    ApiError: class extends Error {},
  };
  const { DateConfirmTab } = load('DateConfirmTab.tsx', {
    react: hooks,
    '@/app/craft/CraftAccount': { useCraftAccount: () => account },
    './date-confirmation-api': api,
    './date-confirm-ui.mjs': helpers,
    './i18n/WwmI18nProvider': { useWwmCopy: () => ({ t: (k) => k }) },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/input': { Input: 'Input' },
    '@/components/ui/checkbox': { Checkbox: 'Checkbox' },
    './DateAvailabilityCalendar': { DateAvailabilityCalendar: 'Calendar' },
    './Notice': { Notice: 'Notice' },
    './api': { connectGoogleCalendar: async () => calls.push(['connect']) },
    sonner: { toast: { success() {} } },
  });
  assert.equal(typeof DateConfirmTab, 'function');
  const render = () => {
    index = 0;
    ri = 0;
    ei = 0;
    effects.length = 0;
    return walk(DateConfirmTab({ room: currentRoom, responses }));
  };
  const button = (tree, key) =>
    tree.find((n) => n.type === 'Button' && n.props.children === `dateConfirm.${key}`);
  return {
    render,
    button,
    calls,
    flushEffects: async () => {
      effects.splice(0).forEach((f) => f());
      await new Promise((r) => setImmediate(r));
    },
    changeAccount: (values) => {
      account = { ...account, ...values };
    },
    changeRoom: (values) => {
      currentRoom = { ...currentRoom, ...values };
    },
    async mount() {
      render();
      effects.forEach((f) => f());
      await new Promise((r) => setImmediate(r));
      return render();
    },
  };
}
for (const field of ['title', 'date', 'recipient', 'optional', 'undo']) {
  for (const rerender of [false, true]) {
    test(`draft ${field} rejects retained review/send ${rerender ? 'after' : 'before'} render`, async () => {
      const second = { ...attendee, userId: other, email: 'second@example.test' };
      const h = harness({
        initial: { status: null, owner: null, review: { attendees: [attendee, second] } },
      });
      await h.mount();
      let tree = await prepare(h);
      tree.filter((n) => n.type === 'Checkbox')[1].props.onCheckedChange(true);
      tree = h.render();
      const oldReview = h.button(tree, 'review').props.onClick;
      await oldReview();
      tree = h.render();
      const oldSend = h.button(tree, 'send').props.onClick;
      if (field === 'title' || field === 'undo') {
        tree.find((n) => n.type === 'Input').props.onChange({ target: { value: 'Changed' } });
        if (field === 'undo') {
          tree = h.render();
          tree.find((n) => n.type === 'Input').props.onChange({ target: { value: 'Meeting' } });
        }
      } else if (field === 'date')
        tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-03');
      else
        tree
          .filter((n) => n.type === 'Checkbox')
          [field === 'recipient' ? 2 : 1].props.onCheckedChange(false);
      if (rerender) h.render();
      await oldReview();
      h.render();
      await oldSend();
      assert.deepEqual(h.calls, [], 'stale review must not restore consent');
      tree = h.render();
      await h.button(tree, 'review').props.onClick();
      await oldSend();
      assert.deepEqual(h.calls, [], 'old send cannot borrow fresh review consent');
      await h.button(h.render(), 'send').props.onClick();
      assert.equal(h.calls.length, 1);
      const body = h.calls[0][2];
      assert.equal(body.title, field === 'title' ? 'Changed' : 'Meeting');
      assert.equal(body.date, field === 'date' ? '2099-01-03' : '2099-01-02');
      assert.deepEqual(body.recipients, field === 'recipient' ? [uid] : [uid, other]);
      assert.deepEqual(
        body.optional,
        ['recipient', 'optional'].includes(field) ? (field === 'optional' ? [] : [uid]) : [],
      );
    });
  }
}
test('saved availability count excludes IDs outside authoritative review roster', async () => {
  const h = harness({
    responses: [
      { userId: uid, availableDates: ['2099-01-02'] },
      { userId: '33333333-3333-4333-8333-333333333333', availableDates: ['2099-01-02'] },
    ],
  });
  let tree = await h.mount();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  const p = tree.find(
    (n) => n.type === 'p' && JSON.stringify(n.props.children).includes('dateConfirm.available'),
  );
  assert.equal(p.props.children.at(-1), 1);
});
test('room timezone change invalidates previously reviewed proposal', async () => {
  const h = harness();
  let tree = await h.mount();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  h.changeRoom({ timezone: 'Asia/Seoul' });
  tree = h.render();
  await h.button(tree, 'send').props.onClick();
  assert.deepEqual(h.calls, []);
});
test('single day → review does not send → explicit send captures exhaustive ids', async () => {
  const h = harness();
  let tree = await h.mount();
  const calendar = tree.find((n) => n.type === 'Calendar');
  assert.equal(calendar.props.inspection, undefined);
  calendar.props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  assert.deepEqual(h.calls, []);
  await h.button(tree, 'send').props.onClick();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].slice(1), [
    id,
    {
      date: '2099-01-02',
      title: 'Meeting',
      revision: 1,
      recipients: [uid],
      excluded: [],
      optional: [],
    },
  ]);
});
test('held send guards double clicks synchronously and freezes edits', async () => {
  let resolve;
  const h = harness({ send: () => new Promise((r) => (resolve = r)) });
  let tree = await h.mount();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  const click = h.button(tree, 'send').props.onClick;
  const a = click(),
    b = click();
  tree = h.render();
  assert.equal(h.calls.length, 1);
  assert.ok(
    tree
      .filter((n) => ['Input', 'Checkbox', 'Calendar'].includes(n.type))
      .every((n) => n.props.disabled),
  );
  resolve({ status: 'reconciling' });
  await Promise.all([a, b]);
  tree = h.render();
  assert.ok(h.button(tree, 'check'));
  assert.equal(h.button(tree, 'send'), undefined);
});
test('member has no selection or private recipient controls', async () => {
  const h = harness({ role: 'MEMBER', initial: { status: null, owner: null, review: null } });
  const tree = await h.mount();
  assert.equal(
    tree.some((n) => n.type === 'Calendar' || n.type === 'Checkbox'),
    false,
  );
});
async function prepare(h) {
  let tree = h.render();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  return h.render();
}
const other = '44444444-4444-4444-8444-444444444444';
for (const [name, change] of [
  ['timezone', { timezone: 'Asia/Seoul' }],
  ['range', { startDate: '2099-01-03' }],
  ['room', { id: other }],
  ['owner', { ownerId: other }],
  ['role', { role: 'MEMBER' }],
])
  test(`old send refuses changed ${name}`, async () => {
    const h = harness();
    await h.mount();
    const tree = await prepare(h),
      old = h.button(tree, 'send').props.onClick;
    h.changeRoom(change);
    h.render();
    await old();
    assert.deepEqual(h.calls, []);
  });
for (const [name, change] of [
  ['logout', { user: null }],
  ['user', { user: { id: other } }],
  ['loading', { loading: true }],
])
  test(`old send refuses changed account ${name}`, async () => {
    const h = harness();
    await h.mount();
    const tree = await prepare(h),
      old = h.button(tree, 'send').props.onClick;
    h.changeAccount(change);
    h.render();
    await old();
    assert.deepEqual(h.calls, []);
  });
test('old review cannot revive invalidated schedule review', async () => {
  const h = harness();
  await h.mount();
  let tree = h.render();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  const oldReview = h.button(tree, 'review').props.onClick;
  await oldReview();
  tree = h.render();
  const oldSend = h.button(tree, 'send').props.onClick;
  h.changeRoom({ timezone: 'Asia/Seoul' });
  h.render();
  await oldReview();
  await oldSend();
  assert.deepEqual(h.calls, []);
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  await h.button(h.render(), 'send').props.onClick();
  assert.equal(h.calls.length, 1);
});
for (const mode of ['room', 'user'])
  test(`${mode} switch hides private email before effects`, async () => {
    const h = harness();
    await h.mount();
    await prepare(h);
    if (mode === 'room') h.changeRoom({ id: other });
    else h.changeAccount({ user: { id: other } });
    const tree = h.render();
    assert.equal(
      tree.some((n) => n.type === 'small' && n.props.children === attendee.email),
      false,
    );
  });
for (const mode of ['room', 'user'])
  test(`held mutation after ${mode} switch cannot clear new operation guard`, async () => {
    const settles = [];
    const h = harness({ send: () => new Promise((r) => settles.push(r)) });
    await h.mount();
    let tree = await prepare(h);
    const first = h.button(tree, 'send').props.onClick();
    if (mode === 'room') h.changeRoom({ id: other });
    else {
      h.changeRoom({ ownerId: other });
      h.changeAccount({ user: { id: other } });
    }
    h.render();
    await h.flushEffects();
    tree = await prepare(h);
    const click = h.button(tree, 'send').props.onClick,
      second = click();
    assert.equal(h.calls.length, 2);
    settles[0]({ status: 'unknown' });
    await first;
    await click();
    assert.equal(h.calls.length, 2);
    tree = h.render();
    assert.ok(tree.some((n) => n.props?.role === 'status'));
    assert.equal(h.button(tree, 'check'), undefined);
    settles[1]({ status: 'failed' });
    await second;
  });
for (const mode of ['room', 'user'])
  test(`held read after ${mode} switch cannot replace scoped data`, async () => {
    let settle;
    let count = 0;
    const h = harness({
      read: () =>
        ++count === 1
          ? new Promise((r) => (settle = r))
          : Promise.resolve({ status: null, owner: null, review: { attendees: [] } }),
    });
    await h.mount();
    if (mode === 'room') h.changeRoom({ id: other });
    else {
      h.changeRoom({ ownerId: other });
      h.changeAccount({ user: { id: other } });
    }
    h.render();
    await h.flushEffects();
    settle({ status: null, owner: null, review: { attendees: [attendee] } });
    await new Promise((r) => setImmediate(r));
    const tree = h.render();
    assert.equal(h.button(tree, 'review').props.disabled, true);
  });
test('roster refresh invalidates held send and old review callback', async () => {
  let count = 0;
  const h = harness({
    read: async () => {
      const value = stored();
      value.review.attendees = ++count === 1 ? [attendee] : [];
      return value;
    },
  });
  let tree = await h.mount();
  const reload = h.button(tree, 'reload').props.onClick;
  h.button(tree, 'edit').props.onClick();
  tree = await prepare(h);
  const old = h.button(tree, 'send').props.onClick;
  tree.filter((n) => n.type === 'Checkbox')[1].props.onCheckedChange(true);
  tree = h.render();
  const oldReview = h.button(tree, 'review').props.onClick;
  await reload();
  await new Promise((r) => setImmediate(r));
  h.render();
  await oldReview();
  await old();
  assert.deepEqual(h.calls, []);
  assert.ok(h.button(h.render(), 'review'));
});
const stored = () => {
  const valid = {
    scheduleMode: 'date',
    roomId: id,
    date: '2098-01-01',
    startDate: '2098-01-01',
    endDate: '2098-01-02',
    timezone: 'Asia/Seoul',
    title: 'Original',
    revision: 1,
    recipients: [{ userId: uid, email: attendee.email, optional: false }],
    excluded: [],
  };
  const root = {
    valid,
    status: 'confirmed',
    url: 'https://www.google.com/calendar/test',
    organizerId: uid,
    organizerEmail: attendee.email,
    eventId: 'event',
    payloadHash: 'hash',
  };
  return {
    status: { ...valid, status: 'confirmed', url: root.url },
    owner: { root, revisions: [], pending: null },
    review: { attendees: [attendee] },
  };
};
test('historical confirmation stays original, edit has no selected day and sends revision two', async () => {
  const h = harness({ initial: stored() });
  let tree = await h.mount();
  assert.ok(
    tree.some((n) => n.type === 'p' && JSON.stringify(n.props.children).includes('2098.01.01')),
  );
  assert.equal(
    tree.some((n) => n.type === 'Calendar'),
    false,
  );
  h.button(tree, 'edit').props.onClick();
  tree = h.render();
  assert.equal(tree.find((n) => n.type === 'Calendar').props.inspection, undefined);
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  await h.button(tree, 'send').props.onClick();
  assert.equal(h.calls[0][0], 'update');
  assert.equal(h.calls[0][2].revision, 2);
  assert.equal(h.calls[0][2].title, 'Original');
});
test('pending update checks stored operation with no client proposal', async () => {
  const initial = stored();
  initial.owner.pending = {
    ...initial.owner.root,
    valid: {
      ...initial.owner.root.valid,
      revision: 2,
      date: '2098-01-02',
      startDate: '2098-01-02',
      endDate: '2098-01-03',
    },
    status: 'reconciling',
    url: null,
    previous: initial.owner.root.valid,
  };
  const h = harness({ initial });
  let tree = await h.mount();
  assert.equal(h.button(tree, 'resend'), undefined);
  await h.button(tree, 'check').props.onClick();
  assert.deepEqual(h.calls, [['check', id, 'update']]);
});
test('resend is explicit and sends only room id', async () => {
  const h = harness({ initial: stored() });
  const tree = await h.mount();
  assert.deepEqual(h.calls, []);
  await h.button(tree, 'resend').props.onClick();
  assert.deepEqual(h.calls, [['resend', id]]);
});
test('recipient change requires another review and optional ids are exact', async () => {
  const h = harness();
  let tree = await h.mount();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  tree.filter((n) => n.type === 'Checkbox')[1].props.onCheckedChange(true);
  tree = h.render();
  await h.button(tree, 'send').props.onClick();
  assert.deepEqual(h.calls, []);
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  await h.button(tree, 'send').props.onClick();
  assert.deepEqual(h.calls[0][2].optional, [uid]);
});
test('definite failure retains proposal and offers re-review before unchanged retry', async () => {
  const h = harness({ send: async () => ({ status: 'failed' }) });
  let tree = await h.mount();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  await h.button(tree, 'send').props.onClick();
  tree = h.render();
  assert.ok(h.button(tree, 'review'));
  assert.equal(tree.find((n) => n.type === 'Calendar').props.inspection, '2099-01-02');
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  await h.button(tree, 'send').props.onClick();
  assert.equal(h.calls.length, 2);
});
test('recipient edit invalidates old send callback before React rerenders', async () => {
  const h = harness();
  let tree = await h.mount();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  const stale = h.button(tree, 'send').props.onClick;
  tree.filter((n) => n.type === 'Checkbox')[1].props.onCheckedChange(true);
  await stale();
  assert.deepEqual(h.calls, []);
});
test('03B range heading is immediately clamped and initial status belongs only to skeleton', () => {
  let i = 0;
  const states = [
    { ...room, startDate: '2099-02-01', endDate: '2099-02-04' },
    null,
    null,
    false,
    false,
    '2099-01-01',
  ];
  const { DateRoomContent } = load('DateWhenWeMeet.tsx', {
    react: {
      ...React,
      useState: (v) => [states[i++] ?? v, () => {}],
      useRef: (v) => ({ current: v }),
      useEffect: () => {},
      useMemo: (f) => f(),
      useCallback: (f) => f,
    },
    './useDateAvailabilitySync': { useDateAvailabilitySync: () => ({ draft: null, receive() {} }) },
    './date-confirm-ui.mjs': helpers,
    './date-availability.mjs': { aggregateDateAvailability: () => ({ dates: [] }) },
    './i18n/WwmI18nProvider': { useWwmCopy: () => ({ t: (k) => k }) },
    '@/components/ui/tabs': {
      Tabs: 'Tabs',
      TabsList: 'TabsList',
      TabsTrigger: 'TabsTrigger',
      TabsContent: 'TabsContent',
    },
    './DateAvailabilityCalendar': { DateAvailabilityCalendar: 'Calendar' },
  });
  const tree = walk(
    DateRoomContent({
      initialRoom: { room, userId: uid },
      responsesPromise: Promise.resolve({ responses: [] }),
    }),
  );
  assert.equal(tree.find((n) => n.type === 'h2').props.children, '2099.02.01');
  assert.equal(tree.filter((n) => n.props?.role === 'status').length, 0);
});
test('unknown outcome remains frozen until explicit status check with no proposal', async () => {
  const h = harness({
    send: async () => {
      throw Error('network');
    },
  });
  let tree = await h.mount();
  tree.find((n) => n.type === 'Calendar').props.onInspect('2099-01-02');
  tree = h.render();
  await h.button(tree, 'review').props.onClick();
  tree = h.render();
  const oldSend = h.button(tree, 'send').props.onClick;
  await oldSend();
  await oldSend();
  assert.equal(h.calls.length, 1);
  tree = h.render();
  assert.equal(h.button(tree, 'send'), undefined);
  await h.button(tree, 'check').props.onClick();
  assert.deepEqual(h.calls[1], ['check', id, 'initial']);
});
