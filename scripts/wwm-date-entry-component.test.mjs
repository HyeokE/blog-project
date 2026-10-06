import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { createWwmTranslator } from '../src/i18n/wwm.mjs';
import {
  creationErrors,
  todayInTimezone,
} from '../src/features/when-we-meet/creation-validation.mjs';
const require = createRequire(import.meta.url);
function harness(overrides = {}, roomMode = 'date') {
  const state = [],
    calls = [],
    cleanups = [],
    effects = [];
  let index = 0,
    props = {},
    account = { user: { id: 'self' }, loading: false };
  const t = createWwmTranslator('en');
  const hooks = {
    ...React,
    useState: (initial) => {
      const i = index++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [
        state[i],
        (value) => {
          state[i] = typeof value === 'function' ? value(state[i]) : value;
        },
      ];
    },
    useRef: (initial) => {
      const i = index++;
      return state[i] ?? (state[i] = { current: initial });
    },
    useEffect: (f) => effects.push(f),
    useLayoutEffect: (f) => {
      const cleanup = f();
      if (cleanup) cleanups.push(cleanup);
    },
    useMemo: (f) => f(),
    useCallback: (f) => f,
  };
  const primitive = (name) => name;
  const stub = new Proxy({}, { get: (_, name) => primitive(String(name)) });
  const imports = {
    react: hooks,
    'react/jsx-runtime': require('react/jsx-runtime'),
    'next/navigation': {
      useRouter: () => ({
        refresh() {
          calls.push(['refresh']);
        },
        push() {},
      }),
    },
    '@/app/craft/CraftAccount': { useCraftAccount: () => account },
    './i18n/WwmI18nProvider': {
      useWwmCopy: () => ({
        t,
        locale: 'en',
        meetingSummary: (value) => {
          calls.push(['summary', value]);
          return 'summary';
        },
        saveStatus: () => ({}),
        scheduleWarning: () => '',
        MEETING_TOASTS: {},
        apiError: () => 'failed',
      }),
    },
    './creation-validation.mjs': {
      creationErrors,
      todayInTimezone,
      revalidateCreationErrors: () => ({}),
    },
    './domain.mjs': {
      makeSlots: (room) => {
        if (room.startTime === null || room.endTime === null)
          throw Error('date room reached timed calendar');
        return [];
      },
    },
    './useAvailabilitySync': { useAvailabilitySync: () => ({ state: 'saved' }) },
    './invitation.mjs': {
      invitationPath: (id, token) => (token ? '/room/' + id + '?invite=' + token : null),
      clearInviteReturn: () => calls.push(['clear']),
    },
    sonner: { toast: { success: () => calls.push(['toast']) } },
    './api': {
      joinRoom: async (...args) => {
        calls.push(['join', ...args]);
      },
      loadRoom: async () => {
        calls.push(['load']);
        return {
          room: {
            title: 'private',
            scheduleMode: roomMode,
            startTime: roomMode === 'date' ? null : '09:00',
            endTime: roomMode === 'date' ? null : '17:30',
          },
          responses: [],
          userId: 'self',
        };
      },
      createRoom: async (...args) => {
        calls.push(['time', ...args]);
        return { id: 't', inviteToken: 'private' };
      },
    },
    './date-api': {
      createDateRoom: async (...args) => {
        calls.push(['date', ...args]);
        return { id: 'd', inviteToken: 'private' };
      },
    },
    './date-creation.mjs': awaitPlaceholder,
    './funnel': new Proxy({}, { get: () => () => {} }),
    './draft.mjs': { clearDraft() {}, saveDraft() {} },
  };
  Object.assign(imports, overrides);
  return import('../src/features/when-we-meet/date-creation.mjs').then((helper) => {
    imports['./date-creation.mjs'] = helper;
    const module = { exports: {} };
    const source = fs.readFileSync(
      process.env.WWM_ENTRY_SOURCE ||
        new URL('../src/features/when-we-meet/WhenWeMeet.tsx', import.meta.url),
      'utf8',
    );
    const code = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(`(function(require,module,exports){${code}\n})`, {
      process: {
        env: {
          NEXT_PUBLIC_SUPABASE_URL: 'fixture',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture',
        },
      },
      window: { location: { origin: 'https://fixture.invalid' }, sessionStorage: {} },
      requestAnimationFrame: (f) => f(),
      document: { getElementById: () => null },
      Date,
      Intl,
    })(
      (id) =>
        imports[id] ??
        (id.endsWith('.css')
          ? {}
          : id === './invite-share'
            ? { inviteShareText: () => 'share' }
            : stub),
      module,
      module.exports,
    );
    return {
      state,
      calls,
      runInviteEffect() {
        effects.find((f) => f.toString().includes('joinAttempted'))();
      },
      account(value) {
        account = value;
      },
      unmount() {
        cleanups.forEach((f) => f());
      },
      render(value = props) {
        props = value;
        index = 0;
        effects.length = 0;
        return module.exports.default(props);
      },
    };
  });
}
const awaitPlaceholder = {};

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  const children = tree.props?.children;
  return [tree, ...(Array.isArray(children) ? children : [children]).flatMap(nodes)];
}
function landing(h, roomId = 'one') {
  h.render({ roomId });
  h.state[1] = 'Kim';
  h.state[8] = 'valid-token';
  return nodes(h.render({ roomId })).find((n) => n.type === 'InvitationLanding').props;
}
for (const mode of ['date', 'time'])
  test(`actual ${mode} invitation joins once and delegates to server without timed hydration`, async () => {
    const h = await harness({}, mode);
    const p = landing(h);
    p.onJoin();
    await new Promise((r) => setImmediate(r));
    assert.equal(h.calls.filter((x) => x[0] === 'join').length, 1);
    assert.equal(h.calls.filter((x) => x[0] === 'load').length, 0);
    assert.equal(h.calls.filter((x) => x[0] === 'refresh').length, 1);
    assert.equal(h.state[2], null);
    assert.equal(h.state[1], 'Kim');
    assert.equal(
      nodes(h.render({ roomId: 'one' })).some((n) => n.type === 'WeeklyAvailability'),
      false,
    );
    assert.equal(
      nodes(h.render({ roomId: 'one' })).find((n) => n.type === 'InvitationLanding').props.busy,
      true,
    );
    p.onJoin();
    await new Promise((r) => setImmediate(r));
    assert.equal(h.calls.filter((x) => x[0] === 'join').length, 1);
  });
test('failed token retains input and permits retry without refresh or room read', async () => {
  let count = 0;
  const h = await harness({
    './api': {
      joinRoom: async () => {
        count++;
        throw Error('wrong token');
      },
    },
  });
  landing(h).onJoin();
  await new Promise((r) => setImmediate(r));
  const p = nodes(h.render({ roomId: 'one' })).find((n) => n.type === 'InvitationLanding').props;
  assert.equal(p.name, 'Kim');
  assert.equal(p.busy, false);
  assert.equal(h.state[8], 'valid-token');
  assert.equal(h.calls.length, 0);
  p.onRetry();
  await new Promise((r) => setImmediate(r));
  assert.equal(count, 2);
});
for (const change of ['room', 'identity', 'loading', 'token', 'unmount'])
  test(`held join ignores stale ${change} completion`, async () => {
    let resolve,
      count = 0;
    const h = await harness({
      './api': {
        joinRoom: () => {
          count++;
          return new Promise((r) => (resolve = r));
        },
      },
    });
    const p = landing(h);
    p.onJoin();
    p.onJoin();
    assert.equal(count, 1);
    if (change === 'unmount') h.unmount();
    else {
      if (change === 'identity') h.account({ user: { id: 'other' }, loading: false });
      if (change === 'loading') h.account({ user: { id: 'self' }, loading: true });
      if (change === 'token') h.state[8] = 'different-token';
      h.render({ roomId: change === 'room' ? 'two' : 'one' });
    }
    const before = JSON.stringify(h.state);
    resolve();
    await new Promise((r) => setImmediate(r));
    assert.equal(h.calls.length, 0);
    assert.equal(JSON.stringify(h.state), before);
  });
for (const mode of ['date', 'time'])
  test(`actual created ${mode} summary passes discriminated clocks and preserves API payload`, async () => {
    const h = await harness();
    h.render();
    h.state[0] = {
      ...h.state[0],
      scheduleMode: mode,
      title: 'Coffee',
      startDate: '2099-01-01',
      endDate: '2099-01-02',
      startTime: '09:00',
      endTime: '17:30',
    };
    h.state[1] = 'Kim';
    await nodes(h.render())
      .find((n) => n.props?.id === 'wwm-create-form')
      .props.onSubmit({ preventDefault() {} });
    const summary = h.calls.find((x) => x[0] === 'summary')[1];
    assert.equal(summary.scheduleMode, mode);
    assert.equal(summary.startTime, mode === 'date' ? null : '09:00');
    assert.equal(summary.endTime, mode === 'date' ? null : '17:30');
    const payload = h.calls.find((x) => x[0] === mode);
    assert.equal(payload[1].title, 'Coffee');
    if (mode === 'date') {
      assert.equal('startTime' in payload[1], false);
      assert.equal(payload[1].name, 'Kim');
    } else {
      assert.equal(payload[1].startTime, '09:00');
      assert.equal(payload[2], 'Kim');
    }
  });

for (const outcome of ['success', 'failure'])
  test(`join returning to the same identity ignores the old epoch ${outcome}`, async () => {
    let settle;
    const h = await harness({
      './api': {
        joinRoom: () =>
          new Promise((resolve, reject) => {
            settle = () => (outcome === 'success' ? resolve() : reject(Error('private error')));
          }),
      },
    });
    const old = landing(h);
    old.onJoin();
    h.account({ user: { id: 'other' }, loading: false });
    h.render();
    h.account({ user: { id: 'self' }, loading: false });
    h.render();
    const before = JSON.stringify(h.state);
    settle();
    await new Promise((r) => setImmediate(r));
    assert.equal(h.calls.length, 0);
    assert.equal(JSON.stringify(h.state), before);
  });
test('retained old invitation callback cannot join a changed room', async () => {
  const h = await harness();
  const old = landing(h);
  h.render({ roomId: 'two' });
  old.onJoin();
  await new Promise((r) => setImmediate(r));
  assert.equal(h.calls.length, 0);
});
test('actual OAuth-return join effect repeats safely without duplicate RPC', async () => {
  const invitation = await import('../src/features/when-we-meet/invitation.mjs');
  let count = 0,
    resolve;
  const h = await harness({
    './invitation.mjs': invitation,
    './api': {
      joinRoom: () => {
        count++;
        return new Promise((r) => (resolve = r));
      },
    },
  });
  const roomId = '12345678-1234-4123-8123-123456789abc';
  h.render({ roomId });
  h.state[1] = 'Kim';
  h.state[8] = 'abcdefab-1234-4123-8123-123456789abc';
  h.state[10] = true;
  h.state[11] = true;
  h.render({ roomId });
  h.runInviteEffect();
  h.runInviteEffect();
  h.render({ roomId });
  h.runInviteEffect();
  assert.equal(count, 1);
  resolve();
  await new Promise((r) => setImmediate(r));
  assert.equal(h.calls.filter((x) => x[0] === 'refresh').length, 1);
  assert.equal(h.state[1], 'Kim');
});
