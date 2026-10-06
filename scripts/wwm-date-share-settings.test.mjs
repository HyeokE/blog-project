import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function loadRoom(imports) {
  const m = { exports: {} };
  const source = fs.readFileSync(
    new URL('../src/features/when-we-meet/DateWhenWeMeet.tsx', import.meta.url),
    'utf8',
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(`(function(require,module,exports){${code}})`, {
    AbortController,
    setTimeout,
    clearTimeout,
    window: { location: { origin: 'https://fixture.invalid', search: '?invite=untrusted' } },
  })((key) => imports[key] ?? (key === 'react/jsx-runtime' ? require(key) : {}), m, m.exports);
  return m.exports;
}
import { load } from './wwm-date-room-harness.mjs';
import * as normalize from '../src/features/when-we-meet/date-normalize.mjs';
import * as availability from '../src/features/when-we-meet/date-availability.mjs';
const token = 'abcdefab-1234-4123-8123-123456789abc',
  id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const room = {
  id,
  ownerId: userId,
  title: 'Dates',
  startDate: '2026-10-01',
  endDate: '2026-10-03',
  timezone: 'UTC',
  scheduleMode: 'date',
  startTime: null,
  endTime: null,
  role: 'ADMIN',
  inviteToken: token,
};
function nodes(t) {
  return !t || typeof t !== 'object'
    ? []
    : [t, ...[t.props?.children].flat(Infinity).flatMap(nodes)];
}
function realCopyHarness() {
  const calls = [];
  let resolve, reject;
  const module = { exports: {} };
  const source = fs.readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const toast = { success: (message) => calls.push(['success', message]) };
  vm.runInNewContext(`(function(require,module,exports){${code}})`, {
    navigator: { clipboard: { writeText: (value) => {
      calls.push(['clipboard', value]);
      return new Promise((yes, no) => { resolve = yes; reject = no; });
    } } },
  })((key) => key === 'sonner' ? { toast } : key === 'react/jsx-runtime' ? require(key) : {}, module, module.exports);
  return { copyLink: module.exports.copyLink, calls, resolve: () => resolve(), reject: () => reject(new Error('clipboard refused')) };
}
for (const guarded of [false, true])
  test(`actual copyLink ${guarded ? 'current guarded' : 'legacy two-argument'} success emits once`, async () => {
    const h = realCopyHarness();
    const result = guarded ? h.copyLink('private link', 'copied', () => true) : h.copyLink('private link', 'copied');
    h.resolve();
    assert.equal(await result, true);
    assert.deepEqual(h.calls, [['clipboard', 'private link'], ['success', 'copied']]);
  });
test('actual copyLink suppresses held success after identity changes', async () => {
  const h = realCopyHarness();
  let current = true;
  const result = h.copyLink('private link', 'copied', () => current);
  current = false;
  h.resolve();
  assert.equal(h.calls.filter(([kind]) => kind === 'success').length, 0);
  assert.equal(await result, false);
  assert.equal(h.calls.filter(([kind]) => kind === 'success').length, 0);
});
for (const throws of [false, true])
  test(`actual copyLink fails closed before clipboard when predicate ${throws ? 'throws' : 'is stale'}`, async () => {
    const h = realCopyHarness();
    const result = h.copyLink('private link', 'copied', () => { if (throws) throw new Error('private'); return false; });
    if (h.calls.length) h.resolve();
    assert.equal(await result, false);
    assert.deepEqual(h.calls, []);
  });
test('actual copyLink fails closed when completion predicate throws', async () => {
  const h = realCopyHarness();
  let current = true;
  const result = h.copyLink('private link', 'copied', () => { if (!current) throw new Error('private'); return true; });
  current = false;
  h.resolve();
  assert.equal(await result, false);
  assert.deepEqual(h.calls, [['clipboard', 'private link']]);
});
for (const current of [false, true])
  test(`actual copyLink held rejection returns false without toast (current=${current})`, async () => {
    const h = realCopyHarness();
    let valid = true;
    const result = h.copyLink('private link', 'copied', () => valid);
    valid = current;
    h.reject();
    assert.equal(await result, false);
    assert.deepEqual(h.calls, [['clipboard', 'private link']]);
  });
function harness(realCopy = null) {
  const state = [],
    calls = [];
  let i = 0,
    account = { user: { id: userId }, loading: false };
  const hooks = {
    ...React,
    useState: (v) => {
      const n = i++;
      if (!(n in state)) state[n] = v;
      return [state[n], (v) => (state[n] = typeof v === 'function' ? v(state[n]) : v)];
    },
    useRef: (v) => {
      const n = i++;
      return state[n] ?? (state[n] = { current: v });
    },
    useEffect: () => {},
    useCallback: (f) => f,
    useMemo: (f) => f(),
  };
  let settle;
  const imports = {
    react: hooks,
    '@/app/craft/CraftAccount': { useCraftAccount: () => account },
    './i18n/WwmI18nProvider': {
      useWwmCopy: () => ({ t: (k) => k, locale: 'en', MEETING_TOASTS: { linkCopied: 'copied' } }),
    },
    './useDateAvailabilitySync': {
      useDateAvailabilitySync: () => ({
        draft: { name: 'Kim', availableDates: [] },
        dirty: true,
        saving: false,
        rangeChanged: false,
        receive() {},
        save() {},
      }),
    },
    './date-availability.mjs': availability,
    './date-normalize.mjs': normalize,
    './RoomChrome': {
      RoomHeader: 'RoomHeader',
      InviteLinkDialog: 'InviteLinkDialog',
      copyLink: realCopy?.copyLink ?? ((value, message) => {
        calls.push(['copy', value, message]);
        return new Promise((r) => (settle = r));
      }),
    },
    './invite-share': { inviteShareText: (link, name, locale) => `${name}/${locale}\n${link}` },
    sonner: { toast: { error: (message) => calls.push(['error', message]) } },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/input': { Input: 'Input' },
    '@/components/ui/tabs': {
      Tabs: 'Tabs',
      TabsList: 'TabsList',
      TabsTrigger: 'TabsTrigger',
      TabsContent: 'TabsContent',
    },
  };
  const { DateRoomContent, default: AuthorizedRoom } = loadRoom(imports);
  let wrapperScope;
  return {
    wrapper: (r = room) => {
      i = 100;
      const result = AuthorizedRoom({
        initialRoom: { room: r, userId },
        responsesPromise: Promise.resolve({ responses: [] }),
      });
      if (result) wrapperScope = result.props.shareScope;
      return result;
    },
    calls,
    receiveRoom: (r) => (state[0] = r),
    account: (v) => (account = v),
    settle: (v) => settle(v),
    render: (r = room, u = userId) => {
      i = 0;
      return nodes(
        DateRoomContent({
          initialRoom: { room: r, userId: u },
          responsesPromise: Promise.resolve({ responses: [] }),
          shareScope: wrapperScope,
          accountState: { userId: account.user?.id ?? null, loading: account.loading },
        }),
      );
    },
  };
}
for (const change of ['room', 'identity', 'loading'])
  test(`actual authorized wrapper invalidates retained Share before child cleanup on ${change}`, async () => {
    const h = harness();
    h.wrapper();
    const old = header(h).props;
    if (change === 'identity') h.account({ user: { id: 'other' }, loading: false });
    if (change === 'loading') h.account({ user: { id: userId }, loading: true });
    h.wrapper(change === 'room' ? { ...room, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } : room);
    const result = old.onInvite();
    if (h.calls.length) h.settle(true);
    await result;
    assert.equal(h.calls.length, 0);
  });
const header = (h) => h.render().find((n) => n.type === 'RoomHeader');
for (const change of ['room', 'user', 'loading', 'token', 'role'])
  test(`actual Date Share with real helper suppresses held success on ${change}`, async () => {
    const copy = realCopyHarness(), h = harness(copy);
    h.wrapper();
    const old = header(h).props;
    const pending = old.onInvite();
    if (change === 'user') h.account({ user: { id: 'other' }, loading: false });
    if (change === 'loading') h.account({ user: { id: userId }, loading: true });
    const next = change === 'room' ? { ...room, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' }
      : change === 'token' ? { ...room, inviteToken: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' }
      : change === 'role' ? { ...room, role: 'MEMBER' } : room;
    h.wrapper(next);
    if (change === 'token' || change === 'role') h.receiveRoom(next);
    h.render(next);
    copy.resolve();
    await pending;
    assert.equal(copy.calls.filter(([kind]) => kind === 'success').length, 0);
    assert.equal(h.render(next).some((n) => n.type === 'InviteLinkDialog' && n.props.link), false);
  });
test('actual Date Share with real helper current success emits once', async () => {
  const copy = realCopyHarness(), h = harness(copy);
  h.wrapper();
  const pending = header(h).props.onInvite();
  copy.resolve();
  await pending;
  assert.deepEqual(copy.calls.map(([kind]) => kind), ['clipboard', 'success']);
  assert.equal(copy.calls[1][1], 'copied');
});
for (const changed of [false, true])
  test(`actual Date Share real clipboard rejection ${changed ? 'stale suppresses' : 'current opens'} fallback`, async () => {
    const copy = realCopyHarness(), h = harness(copy);
    h.wrapper();
    const pending = header(h).props.onInvite();
    if (changed) { h.account({ user: { id: 'other' }, loading: false }); h.wrapper(); }
    copy.reject();
    await pending;
    assert.equal(copy.calls.filter(([kind]) => kind === 'success').length, 0);
    assert.equal(h.render().some((n) => n.type === 'InviteLinkDialog' && n.props.link), !changed);
  });
test('shared header preserves date metadata and disabled settings', () => {
  const h = harness(),
    p = header(h)?.props;
  assert.ok(p);
  assert.equal(p.title, 'Dates');
  assert.equal(p.confirmation, null);
  assert.equal(p.settingsDisabled, true);
  assert.equal(h.render().filter((n) => n.type === 'h1').length, 0);
  assert.equal(h.render().find((n) => n.type === 'Button').props.disabled, false);
});
for (const role of ['ADMIN', 'MEMBER'])
  test(`authorized ${role} Share copies exact token link with own draft name`, async () => {
    const h = harness();
    const { craftDateRoomEntry } = load('date-server.ts', { './date-normalize.mjs': normalize });
    const columns = [];
    const row = {
      id,
      owner_id: role === 'ADMIN' ? userId : 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      title: room.title,
      start_date: room.startDate,
      end_date: room.endDate,
      timezone: room.timezone,
      schedule_mode: 'date',
      start_time: null,
      end_time: null,
      invite_token: token,
    };
    const query = {
      select: (value) => {
        columns.push(value);
        return query;
      },
      eq: () => query,
      single: async () => ({ data: columns.length === 1 ? { schedule_mode: 'date' } : row }),
    };
    const entry = await craftDateRoomEntry(id, {
      user: { id: userId },
      client: { from: () => query },
    });
    assert.equal(entry.kind, 'date');
    assert.equal(entry.room.role, role);
    assert.equal(columns[1].split(',').includes('invite_token'), true);
    const p = h.render(entry.room).find((n) => n.type === 'RoomHeader')?.props;
    assert.ok(p);
    const result = p.onInvite();
    assert.equal(
      h.calls[0][1],
      `Kim/en\nhttps://fixture.invalid/craft/when-we-meet/${id}?invite=${token}`,
    );
    h.settle(true);
    await result;
    assert.equal(h.calls.length, 1);
  });
for (const inviteToken of [undefined, null])
  test(`missing ${inviteToken} token cannot copy`, async () => {
    const h = harness();
    const p = h.render({ ...room, inviteToken }).find((n) => n.type === 'RoomHeader')?.props;
    assert.ok(p);
    await p.onInvite();
    assert.deepEqual(h.calls, [['error', 'room.linkUnavailable']]);
  });
test('clipboard failure exposes plain link and share in existing selectable dialog only', async () => {
  const h = harness(),
    p = header(h)?.props;
  assert.ok(p);
  const result = p.onInvite();
  h.settle(false);
  await result;
  const dialog = h.render().find((n) => n.type === 'InviteLinkDialog');
  assert.equal(
    dialog.props.link,
    `https://fixture.invalid/craft/when-we-meet/${id}?invite=${token}`,
  );
  assert.equal(dialog.props.share, h.calls[0][1]);
  assert.equal(h.calls.length, 1);
});
for (const change of ['room', 'user', 'loading'])
  test(`retained Share and held failure cannot expose stale ${change}`, async () => {
    const h = harness(),
      old = header(h)?.props;
    assert.ok(old);
    const result = old.onInvite();
    if (change === 'user') h.account({ user: { id: 'other' }, loading: false });
    if (change === 'loading') h.account({ user: { id: userId }, loading: true });
    const next = change === 'room' ? { ...room, id: 'cccccccc-cccc-cccc-cccc-cccccccccccc' } : room;
    h.render(next);
    h.settle(false);
    await result;
    await old.onInvite();
    assert.equal(h.calls.length, 1);
    assert.equal(
      h.render(next).some((n) => n.type === 'InviteLinkDialog' && n.props.link),
      false,
    );
  });
test('guest and RLS-denied nonmember entry never selects invitation column', async () => {
  const { craftDateRoomEntry } = load('date-server.ts', { './date-normalize.mjs': normalize });
  for (const user of [null, { id: userId }]) {
    const columns = [];
    const query = {
      select: (c) => {
        columns.push(c);
        return query;
      },
      eq: () => query,
      single: async () => ({ error: { code: '42501' } }),
    };
    const value = await craftDateRoomEntry(id, { user, client: { from: () => query } });
    assert.equal(value.kind, 'guest');
    assert.equal(
      columns.some((c) => c.includes('invite_token')),
      false,
    );
  }
});
