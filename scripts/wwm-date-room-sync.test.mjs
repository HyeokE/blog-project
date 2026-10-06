import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { load } from './wwm-date-room-harness.mjs';
import * as availability from '../src/features/when-we-meet/date-availability.mjs';
import * as dateNormalize from '../src/features/when-we-meet/date-normalize.mjs';
import * as civil from '../src/features/when-we-meet/date-calendar.mjs';
function harness(save, timers = false) {
  let index = 0;
  let runEffects = true;
  const state = [];
  const hooks = {
    ...React,
    useState: (initial) => {
      const i = index++;
      if (!(i in state)) state[i] = typeof initial === 'function' ? initial() : initial;
      return [state[i], (v) => (state[i] = typeof v === 'function' ? v(state[i]) : v)];
    },
    useRef: (initial) => {
      const i = index++;
      return state[i] ?? (state[i] = { current: initial });
    },
    useEffect: (effect, deps) => {
      const i = index++;
      if (!runEffects) return;
      if (!timers && deps.length !== 2) return;
      const previous = state[i];
      if (!previous || deps.some((v, n) => v !== previous.deps[n])) {
        previous?.cleanup?.();
        state[i] = { deps, cleanup: effect() };
      }
    },
    useCallback: (f, deps) => {
      const i = index++;
      const previous = state[i];
      if (!previous || deps.some((v, n) => v !== previous.deps[n])) {
        state[i] = { deps, callback: f };
      }
      return state[i].callback;
    },
  };
  const module = load('useDateAvailabilitySync.ts', {
    react: hooks,
    './date-calendar.mjs': civil,
    './date-normalize.mjs': dateNormalize,
    './date-availability.mjs': availability,
    './date-api': { saveDateResponse: save },
  });
  return {
    render: (
      room = { startDate: '2026-10-01', endDate: '2026-10-03' },
      user = 'self',
      effects = true,
      options,
    ) => {
      index = 0;
      runEffects = effects;
      assert.equal(typeof module.useDateAvailabilitySync, 'function');
      return module.useDateAvailabilitySync('room', user, room, options);
    },
  };
}
const initial = { name: 'Me', availableDates: ['2026-10-01'] };
test('unknown baseline disables writes; held save serializes and preserves edits after dispatch', async () => {
  let resolve,
    count = 0,
    args;
  const h = harness((...values) => {
    count++;
    args = values;
    return new Promise((r) => (resolve = r));
  });
  let model = h.render();
  await model.save();
  assert.equal(count, 0);
  model.receive(initial);
  model = h.render();
  model.edit({ ...initial, availableDates: ['2026-10-01', '2026-10-02'] });
  model = h.render();
  const saving = model.save();
  await model.save();
  assert.equal(count, 1);
  assert.deepEqual(args[3], initial);
  model.edit({ ...initial, availableDates: ['2026-10-02'] });
  resolve({
    saved: true,
    value: {
      name: 'Me',
      availableDates: ['2026-10-01', '2026-10-02', '2026-10-03'],
      version: '2026-10-07T00:00:00.123456Z',
    },
  });
  await saving;
  assert.deepEqual(h.render().draft.availableDates, ['2026-10-02', '2026-10-03']);
});
test('remote receive and failed save preserve local name and dates', async () => {
  const h = harness(async () => {
    throw Error('private token');
  });
  let m = h.render();
  m.receive(initial);
  m = h.render();
  m.edit({ name: 'Mine', availableDates: ['2026-10-02'] });
  m.receive({ name: 'Remote', availableDates: ['2026-10-01', '2026-10-03'] });
  m = h.render();
  assert.deepEqual(m.draft, { name: 'Mine', availableDates: ['2026-10-02', '2026-10-03'] });
  await m.save();
  assert.equal(h.render().error, true);
  assert.equal(h.render().draft.name, 'Mine');
});
test('schedule extension hydrates against the received range, not the old closure', () => {
  const h = harness(async () => ({}));
  let m = h.render();
  m.receive(initial);
  m = h.render();
  m.receive(
    { name: 'Me', availableDates: ['2026-10-04'] },
    { startDate: '2026-10-01', endDate: '2026-10-04' },
  );
  assert.deepEqual(h.render().draft.availableDates, ['2026-10-04']);
});
test('remote receive during held save preserves local delta and remote additions', async () => {
  let resolve;
  const h = harness(() => new Promise((r) => (resolve = r)));
  let m = h.render();
  m.receive(initial);
  m = h.render();
  m.edit({ name: 'Mine', availableDates: ['2026-10-01', '2026-10-02'] });
  m = h.render();
  const saving = m.save();
  m.receive({ name: 'Remote', availableDates: ['2026-10-01', '2026-10-03'] });
  assert.deepEqual(h.render().draft.availableDates, ['2026-10-01', '2026-10-02', '2026-10-03']);
  resolve({
    saved: true,
    value: {
      name: 'Mine',
      availableDates: ['2026-10-01', '2026-10-02', '2026-10-03'],
      version: '2026-10-07T00:00:00.123456Z',
    },
  });
  await saving;
  assert.equal(h.render().draft.name, 'Mine');
  assert.deepEqual(h.render().draft.availableDates, ['2026-10-01', '2026-10-02', '2026-10-03']);
});
const extended = { startDate: '2026-10-01', endDate: '2026-10-04' };
const value = (dates, name = 'Me') => ({ name, availableDates: dates.map((d) => '2026-10-0' + d) });
function held() {
  const resolvers = [];
  const h = harness(() => new Promise((r) => resolvers.push(r)));
  return { h, resolvers };
}
test('late ACK retains remote fourth date from expanded range before rerender', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([]));
  m = h.render();
  m.edit(value([1, 2]));
  m = h.render();
  const pending = m.save();
  m.receive(value([4]), extended);
  resolvers[0]({ saved: true, value: ack(value([1, 2])) });
  await pending;
  m = h.render(extended);
  assert.deepEqual(m.draft, value([1, 2, 4]));
  assert.deepEqual(JSON.parse(JSON.stringify(m.baseline)), value([1, 2]));
  assert.equal(m.dirty, true);
  assert.equal(m.rangeChanged, false);
  assert.equal(m.error, false);
});
test('late ACK bounds baseline after shrink and retains trim warning until acknowledgement', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([1]));
  m = h.render();
  m.edit(value([1, 2, 3]));
  m = h.render();
  const pending = m.save();
  const shrunk = { startDate: '2026-10-01', endDate: '2026-10-02' };
  m.receive(value([1]), shrunk);
  resolvers[0]({ saved: true, value: ack(value([1, 2, 3])) });
  await pending;
  m = h.render(shrunk);
  assert.deepEqual(JSON.parse(JSON.stringify(m.baseline)), value([1, 2]));
  assert.deepEqual(m.draft, value([1, 2]));
  assert.equal(m.dirty, false);
  assert.equal(m.rangeChanged, true);
  m.acknowledgeRange();
  assert.equal(h.render(shrunk).rangeChanged, false);
});
test('local edits in expansion survive held save and remote update', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([]));
  m = h.render();
  m.edit(value([1, 2]));
  m = h.render();
  const pending = m.save();
  m.receive(value([3]), extended);
  m.edit(value([2, 3, 4], 'Local'));
  resolvers[0]({ saved: true, value: ack(value([1, 2])) });
  await pending;
  assert.deepEqual(h.render(extended).draft, value([2, 3, 4], 'Local'));
});
for (const [label, remote, expected] of [
  ['add', value([1, 3]), value([1, 2, 3])],
  ['remove', value([]), value([2])],
  ['name', value([1], 'Remote'), value([1, 2], 'Remote')],
])
  test('older ACK preserves received remote ' + label, async () => {
    const { h, resolvers } = held();
    let m = h.render();
    m.receive(value([1]));
    m = h.render();
    m.edit(value([1, 2]));
    m = h.render();
    const pending = m.save();
    m.receive(remote);
    resolvers[0]({ saved: true, value: ack(value([1, 2])) });
    await pending;
    m = h.render();
    assert.deepEqual(m.draft, expected);
    assert.deepEqual(JSON.parse(JSON.stringify(m.baseline)), value([1, 2]));
    assert.equal(m.dirty, true);
  });
test('old identity ACK cannot clear new identity pending request', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([]));
  m = h.render();
  m.edit(value([1]));
  m = h.render();
  const old = m.save();
  m = h.render(undefined, 'other');
  m.receive(value([], 'Other'));
  m = h.render(undefined, 'other');
  m.edit(value([2], 'Other'));
  m = h.render(undefined, 'other');
  const fresh = m.save();
  assert.equal(resolvers.length, 2);
  resolvers[0]({ saved: true, value: ack(value([1])) });
  await old;
  m = h.render(undefined, 'other');
  assert.deepEqual(m.baseline, value([], 'Other'));
  assert.deepEqual(m.draft, value([2], 'Other'));
  assert.equal(m.saving, true);
  await m.save();
  assert.equal(resolvers.length, 2);
  resolvers[1]({ saved: true, value: ack(value([2], 'Other')) });
  await fresh;
  assert.equal(h.render(undefined, 'other').saving, false);
});
test('received remote removal is not restored by ACK of an unsent date', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([1, 3]));
  m = h.render();
  m.edit(value([2]));
  m = h.render();
  const pending = m.save();
  m.receive(value([1]));
  resolvers[0]({ saved: true, value: ack(value([2, 3])) });
  await pending;
  m = h.render();
  assert.deepEqual(m.draft, value([2]));
  assert.deepEqual(m.baseline, value([2, 3]));
  assert.equal(m.dirty, true);
});
test('rendered expanded metadata governs held ACK without receive', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([]));
  m = h.render();
  m.edit(value([1]));
  m = h.render();
  const pending = m.save();
  m = h.render(extended);
  m.edit(value([1, 4]));
  resolvers[0]({ saved: true, value: ack(value([1])) });
  await pending;
  assert.deepEqual(h.render(extended).draft, value([1, 4]));
});
test('unchanged rendered room cannot rewind explicitly received metadata', async () => {
  const { h, resolvers } = held();
  const old = { startDate: '2026-10-01', endDate: '2026-10-03' };
  let m = h.render(old);
  m.receive(value([]));
  m = h.render(old);
  m.edit(value([1, 2]));
  m = h.render(old);
  const pending = m.save();
  m.receive(value([4]), extended);
  m = h.render(old);
  m.edit(value([2, 4]));
  resolvers[0]({ saved: true, value: ack(value([1, 2])) });
  await pending;
  assert.deepEqual(h.render(extended).draft, value([2, 4]));
});
test('received schedule from previous identity cannot leak into new scope', () => {
  const { h } = held();
  const old = { startDate: '2026-10-01', endDate: '2026-10-03' };
  let m = h.render(old);
  m.receive(value([4]), extended);
  m = h.render(old, 'other');
  m.receive(value([]));
  m = h.render(old, 'other');
  m.edit(value([4]));
  assert.deepEqual(h.render(old, 'other').draft, value([]));
});
test('post-dispatch local removal of a received addition survives older ACK', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([1]));
  m = h.render();
  m.edit(value([1, 2]));
  m = h.render();
  const pending = m.save();
  m.receive(value([1, 3]));
  m = h.render();
  m.edit(value([2], 'Local'));
  resolvers[0]({ saved: true, value: ack(value([1, 2])) });
  await pending;
  m = h.render();
  assert.deepEqual(m.draft, value([2], 'Local'));
  assert.equal(m.dirty, true);
});
test('local name revert after received rename survives ACK containing remote name', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(value([1]));
  m = h.render();
  m.edit(value([1, 2]));
  m = h.render();
  const pending = m.save();
  m.receive(value([1], 'Remote'));
  m = h.render();
  m.edit(value([1, 2], 'Me'));
  resolvers[0]({ saved: true, value: ack(value([1, 2], 'Remote')) });
  await pending;
  m = h.render();
  assert.deepEqual(m.draft, value([1, 2], 'Me'));
  assert.equal(m.dirty, true);
});
test('shrink warning gates remaining dirty edits until acknowledgement', async () => {
  const { h, resolvers } = held();
  const shrunk = { startDate: '2026-10-01', endDate: '2026-10-02' };
  let m = h.render();
  m.receive(value([1]));
  m = h.render();
  m.edit(value([1, 2, 3]));
  m = h.render();
  const pending = m.save();
  m.receive(value([1]), shrunk);
  m.edit(value([1, 2], 'Local'));
  resolvers[0]({ saved: true, value: ack(value([1, 2, 3])) });
  await pending;
  m = h.render(shrunk);
  assert.deepEqual(m.baseline, value([1, 2]));
  assert.deepEqual(m.draft, value([1, 2], 'Local'));
  assert.equal(m.dirty, true);
  assert.equal(m.rangeChanged, true);
  await m.save();
  assert.equal(resolvers.length, 1);
  m.acknowledgeRange();
  m = h.render(shrunk);
  const fresh = m.save();
  assert.equal(resolvers.length, 2);
  resolvers[1]({ saved: true, value: ack(value([1, 2], 'Local')) });
  await fresh;
  assert.equal(h.render(shrunk).dirty, false);
});

const same = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);
test('structured save returns ACK and no-op, rejects unknown baseline', async () => {
  let count = 0;
  const h = harness(async () => {
    count++;
    return { saved: true, value: ack(value([2], 'ACK')) };
  });
  const m = h.render();
  same(await m.save(), { ok: false, reason: 'notReady' });
  m.receive(initial);
  same(await m.save(), { ok: true, value: initial });
  m.edit(value([2]));
  same(await m.save(), { ok: true, value: value([2], 'ACK') });
  assert.equal(count, 1);
});
test('rename uses latest draft dates and remote baseline', async () => {
  let args;
  const h = harness(async (...a) => {
    args = a;
    return { saved: true, value: ack(value([2, 3], 'New')) };
  });
  const m = h.render();
  m.receive(initial);
  const rename = m.rename;
  m.edit(value([2]));
  m.receive(value([1, 3], 'Remote'));
  same(await rename(' New '), { ok: true, value: value([2, 3], 'New') });
  assert.deepEqual(args.slice(1), ['New', value([2, 3]).availableDates, value([1, 3], 'Remote')]);
});
test('busy rename preserves draft and post-dispatch edits survive ACK', async () => {
  const { h, resolvers } = held();
  const m = h.render();
  m.receive(initial);
  const pending = m.rename('New');
  same(await m.rename('Busy'), { ok: false, reason: 'busy' });
  assert.equal(h.render().draft.name, 'New');
  m.edit(value([2], 'Later'));
  resolvers[0]({ saved: true, value: ack(value([1], 'New')) });
  same(await pending, { ok: true, value: value([1], 'New') });
  assert.deepEqual(h.render().draft, value([2], 'Later'));
});
test('retained callbacks cannot bypass shrink or identity guard', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(initial);
  m.edit(value([1, 3]));
  const save = m.save,
    rename = m.rename;
  m.receive(initial, { startDate: '2026-10-01', endDate: '2026-10-02' });
  same(await save(), { ok: false, reason: 'rangeChanged' });
  same(await rename('New'), { ok: false, reason: 'rangeChanged' });
  m = h.render(undefined, 'other');
  m.receive(value([2], 'Other'));
  m.edit(value([3], 'Other'));
  same(await save(), { ok: false, reason: 'superseded' });
  same(await rename('Old'), { ok: false, reason: 'superseded' });
  assert.equal(resolvers.length, 0);
});
test('invalid rename and malformed ACK never confirm baseline', async () => {
  let count = 0;
  const h = harness(async () => {
    count++;
    return { saved: false, value: ack(value([2])) };
  });
  const m = h.render();
  m.receive(initial);
  for (const name of ['', 'x'.repeat(51), 'bad\nname'])
    same(await m.rename(name), { ok: false, reason: 'failed' });
  assert.equal(count, 0);
  m.edit(value([2]));
  same(await m.save(), { ok: false, reason: 'failed' });
  assert.deepEqual(h.render().baseline, initial);
});

test('rendered shrink blocks dispatch even without receive', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { saved: true, value: ack(value([1], 'New')) };
  });
  let m = h.render();
  m.receive(initial);
  m.edit(value([1, 3]));
  m = h.render({ startDate: '2026-10-01', endDate: '2026-10-02' });
  same(await m.rename('New'), { ok: false, reason: 'rangeChanged' });
  assert.equal(calls, 0);
  assert.equal(h.render().draft.name, 'Me');
});
test('superseded held rename returns failure and cannot confirm new scope', async () => {
  const { h, resolvers } = held();
  let m = h.render();
  m.receive(initial);
  const pending = m.rename('New');
  m = h.render(undefined, 'other');
  m.receive(value([2], 'Other'));
  resolvers[0]({ saved: true, value: ack(value([1], 'New')) });
  same(await pending, { ok: false, reason: 'superseded' });
  assert.deepEqual(h.render(undefined, 'other').baseline, value([2], 'Other'));
});

test('new callbacks before identity effect cannot dispatch old baseline', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { saved: true, value: ack(value([1], 'New')) };
  });
  let m = h.render();
  m.receive(initial);
  m.edit(value([2]));
  m = h.render(undefined, 'other', false);
  same(await m.save(), { ok: false, reason: 'notReady' });
  same(await m.rename('New'), { ok: false, reason: 'notReady' });
  assert.equal(calls, 0);
});

for (const [label, canMutate] of [
  ['false', () => false],
  [
    'throw',
    () => {
      throw Error('blocked');
    },
  ],
])
  test(
    'latest mutation guard ' + label + ' blocks retained callbacks without changing draft',
    async () => {
      let calls = 0;
      const h = harness(async () => {
        calls++;
        return { saved: true, value: ack(value([2])) };
      });
      const old = h.render();
      old.receive(initial);
      old.edit(value([2], 'Staged'));
      h.render(undefined, 'self', false, { canMutate });
      same(await old.save(), { ok: false, reason: 'busy' });
      same(await old.rename('Rejected'), { ok: false, reason: 'busy' });
      const after = h.render(undefined, 'self', true, { canMutate });
      same(after.draft, value([2], 'Staged'));
      same(after.baseline, initial);
      assert.equal(after.error, false);
      assert.equal(calls, 0);
    },
  );

for (const second of ['false', 'throw'])
  test(
    'rename prepares and dispatches atomically with one permission evaluation: ' + second,
    async () => {
      let evaluations = 0,
        calls = 0;
      const options = { canMutate: () => true };
      const h = harness(async (...args) => {
        calls++;
        same(args.slice(1), ['Accepted', initial.availableDates, initial]);
        return { saved: true, value: ack(value([1], 'Accepted')) };
      });
      const m = h.render(undefined, 'self', true, options);
      m.receive(initial);
      options.canMutate = () => {
        evaluations++;
        if (evaluations === 1) return true;
        if (second === 'throw') throw Error('second evaluation blocked');
        return false;
      };
      const result = await m.rename(' Accepted ');
      // A blocked operation must never leave behind an unsent name change.
      if (!result.ok) same(h.render().draft, initial);
      same(result, { ok: true, value: value([1], 'Accepted') });
      assert.equal(evaluations, 1);
      assert.equal(calls, 1);
      const after = h.render();
      same(after.draft, value([1], 'Accepted'));
      same(after.baseline, value([1], 'Accepted'));
      assert.equal(after.dirty, false);
    },
  );

test('invalid rename preserves clean draft and baseline without dispatch', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
  });
  const m = h.render();
  m.receive(initial);
  for (const name of ['', ' ', 'x'.repeat(51), 'bad\nname']) {
    same(await m.rename(name), { ok: false, reason: 'failed' });
    const after = h.render();
    same(after.draft, initial);
    same(after.baseline, initial);
    assert.equal(after.dirty, false);
  }
  assert.equal(calls, 0);
});

test('normalized unchanged rename is a structured no-op', async () => {
  let calls = 0;
  const h = harness(async () => {
    calls++;
  });
  const m = h.render();
  m.receive(initial);
  same(await m.rename(' Me '), { ok: true, value: initial });
  assert.equal(calls, 0);
  assert.equal(h.render().dirty, false);
});

test('autosave guard does not block manual rename or discard its held ACK', async () => {
  const { h, resolvers } = held();
  const options = { canMutate: () => true, canAutosave: () => false };
  const m = h.render(undefined, 'self', true, options);
  m.receive(initial);
  m.edit(value([2], 'Staged'));
  const pending = m.rename('New');
  h.render(undefined, 'self', false, { canMutate: () => false, canAutosave: () => false });
  resolvers[0]({ saved: true, value: ack(value([2], 'New')) });
  same(await pending, { ok: true, value: value([2], 'New') });
  same(h.render(undefined, 'self', true, options).baseline, value([2], 'New'));
});

for (const key of ['canMutate', 'canAutosave'])
  for (const throws of [false, true])
    test(
      key + ' blocks held autosave before effects and resumes with a fresh timer; throws=' + throws,
      async (t) => {
        t.mock.timers.enable({ apis: ['setTimeout'] });
        let calls = 0,
          args;
        const h = harness(async (...a) => {
          calls++;
          args = a;
          return { saved: true, value: ack({ name: a[1], availableDates: a[2] }) };
        }, true);
        const enabled = { canMutate: () => true, canAutosave: () => true };
        const blocked = {
          ...enabled,
          [key]: () => {
            if (throws) throw Error('blocked');
            return false;
          },
        };
        let m = h.render(undefined, 'self', true, enabled);
        m.receive(initial);
        m.edit(value([2]));
        h.render(undefined, 'self', true, enabled);
        t.mock.timers.tick(699);
        h.render(undefined, 'self', false, blocked);
        t.mock.timers.tick(1);
        assert.equal(calls, 0);
        m = h.render(undefined, 'self', true, blocked);
        m.edit(value([3], 'Latest'));
        h.render(undefined, 'self', true, blocked);
        t.mock.timers.tick(1400);
        assert.equal(calls, 0);
        assert.equal(h.render(undefined, 'self', true, blocked).error, false);
        h.render(undefined, 'self', true, enabled);
        t.mock.timers.tick(699);
        assert.equal(calls, 0);
        t.mock.timers.tick(1);
        await Promise.resolve();
        assert.equal(calls, 1);
        same(args.slice(1, 3), ['Latest', value([3]).availableDates]);
        h.render(undefined, 'self', true, enabled);
        t.mock.timers.tick(1400);
        assert.equal(calls, 1);
      },
    );

test('permission ABA cannot revive a retained timer before effects', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { saved: true, value: ack(value([2])) };
  }, true);
  const enabled = { canMutate: () => true };
  const m = h.render(undefined, 'self', true, enabled);
  m.receive(initial);
  m.edit(value([2]));
  h.render(undefined, 'self', true, enabled);
  t.mock.timers.tick(699);
  h.render(undefined, 'self', false, { canMutate: () => false });
  h.render(undefined, 'self', false, enabled);
  t.mock.timers.tick(1);
  assert.equal(calls, 0);
});

test('three-argument callers still autosave after 700ms', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { saved: true, value: ack(value([2])) };
  }, true);
  const m = h.render();
  m.receive(initial);
  m.edit(value([2]));
  h.render();
  t.mock.timers.tick(699);
  assert.equal(calls, 0);
  t.mock.timers.tick(1);
  await Promise.resolve();
  assert.equal(calls, 1);
});

test('manual save ignores autosave-only blocking', async () => {
  const h = harness(async () => ({ saved: true, value: ack(value([2])) }));
  const m = h.render(undefined, 'self', true, { canAutosave: () => false });
  m.receive(initial);
  m.edit(value([2]));
  same(await m.save(), { ok: true, value: value([2]) });
});

function ack(value) {
  return { ...value, version: '2026-10-07T00:00:00.123456Z' };
}
const inheritedDates = new Array(1);
Object.setPrototypeOf(
  inheritedDates,
  Object.assign(Object.create(Array.prototype), { 0: '2026-10-02' }),
);
for (const [label, result] of [
  ['missing version', { saved: true, value: value([2]) }],
  ...[
    null,
    42,
    'raw',
    '2026-02-29T00:00:00.123456Z',
    '2026-10-07',
    '2026-10-07T00:00:00.1234567Z',
  ].map((version) => [
    'bad version ' + version,
    { saved: true, value: { ...value([2]), version } },
  ]),
  ['sparse dates', { saved: true, value: ack({ name: 'Me', availableDates: new Array(1) }) }],
  [
    'inherited date index',
    { saved: true, value: ack({ name: 'Me', availableDates: inheritedDates }) },
  ],
  ['inherited value fields', { saved: true, value: Object.create(ack(value([2]))) }],
  ...[[null], [42], ['2026-02-30'], ['2026-10-2'], ['2026-10-02', '2026-10-02']].map(
    (availableDates) => [
      'bad dates ' + JSON.stringify(availableDates),
      { saved: true, value: ack({ name: 'Me', availableDates }) },
    ],
  ),
  ['invalid name', { saved: true, value: ack(value([2], ' bad ')) }],
  ['not saved', { saved: false, value: ack(value([2])) }],
])
  test('invalid ACK preserves baseline and local intent: ' + label, async () => {
    let calls = 0;
    const h = harness(async () => {
      calls++;
      return result;
    });
    const m = h.render();
    m.receive(initial);
    m.edit(value([2], 'Local'));
    same(await m.save(), { ok: false, reason: 'failed' });
    const after = h.render();
    same(after.baseline, initial);
    same(after.draft, value([2], 'Local'));
    assert.equal(after.error, true);
    assert.equal(after.saving, false);
    assert.equal(after.dirty, true);
    assert.equal(calls, 1);
  });
test('valid microsecond ACK confirms exactly one request without rewriting version', async () => {
  const payload = ack(value([2]));
  let calls = 0;
  const h = harness(async () => {
    calls++;
    return { saved: true, value: payload };
  });
  const m = h.render();
  m.receive(initial);
  m.edit(value([2]));
  same(await m.save(), { ok: true, value: value([2]) });
  same(h.render().baseline, value([2]));
  assert.equal(payload.version, '2026-10-07T00:00:00.123456Z');
  assert.equal(calls, 1);
});
