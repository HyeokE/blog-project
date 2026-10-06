import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import * as availability from '../src/features/when-we-meet/date-availability.mjs';
import * as creation from '../src/features/when-we-meet/creation-validation.mjs';
import * as ui from '../src/features/when-we-meet/date-confirm-ui.mjs';
import * as confirmationNormalizer from '../src/features/when-we-meet/confirm-tab.mjs';
const root = path.resolve(import.meta.dirname, '..');
let shared;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file);
  assert.ok(fs.existsSync(path.join(root, file)), `Missing isolated fixture: ${file}`);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  vm.runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: file })(
    (key) => {
      if (key === 'node:path') return path;
      if (key === './mock-api') return shared;
      if (key.endsWith('/confirm-tab.mjs')) return confirmationNormalizer;
      if (key.endsWith('/date-availability.mjs')) return availability;
      if (key.endsWith('/creation-validation.mjs')) return creation;
      if (key.endsWith('/date-confirm-ui.mjs')) return ui;
      if (key === './mock-date-api') return load('src/stories/wwm/mock-date-api.ts');
      throw Error(`Unexpected fixture dependency: ${key}`);
    },
    module,
    module.exports,
  );
  cache.set(file, module.exports);
  return module.exports;
}
shared = load('src/stories/wwm/mock-api.ts');
const date = () => load('src/stories/wwm/mock-date-api.ts');
const confirm = () => load('src/stories/wwm/mock-date-confirmation-api.ts');
const init = () => {
  date().resetDateMock();
  confirm().resetDateConfirmationMock();
};
const input = () => ({
  date: date().dateState.room.startDate,
  title: 'Synthetic day',
  revision: 1,
  recipients: [date().OWNER, date().MORGAN],
  excluded: [date().TAYLOR],
  optional: [date().MORGAN],
});
test('date transport fixture exists before implementation', () => {
  assert.ok(
    fs.existsSync(path.join(root, 'src/stories/wwm/mock-date-api.ts')),
    'Missing date transport mock',
  );
});
test('exact relative and absolute transport isolation preserves timed aliases and synthetic env', async () => {
  const config = load('.storybook/main.ts').default;
  const out = await config.viteFinal({
    plugins: [],
    resolve: { alias: [{ find: 'keep-existing', replacement: 'keep' }] },
  });
  const plugin = out.plugins.find((p) => p.name === 'wwm-isolated-transports');
  for (const [source, target] of [
    ['date-api', 'mock-date-api.ts'],
    ['date-confirmation-api', 'mock-date-confirmation-api.ts'],
    ['api', 'mock-api.ts'],
  ]) {
    assert.equal(
      plugin.resolveId(`./${source}`, `${root}/src/features/when-we-meet/DateWhenWeMeet.tsx`),
      path.join(root, 'src/stories/wwm', target),
    );
    assert.equal(
      plugin.resolveId(`./${source}-extra`, `${root}/src/features/when-we-meet/DateWhenWeMeet.tsx`),
      undefined,
    );
    assert.equal(
      plugin.resolveId(`./${source}`, `${root}/src/other/DateWhenWeMeet.tsx`),
      undefined,
    );
    const alias = out.resolve.alias.find(
      (a) => a.find instanceof RegExp && a.find.test(`@/features/when-we-meet/${source}`),
    );
    // Legacy timed alias may remain a string; the new date aliases must be exact regexes.
    const resolved =
      alias ?? out.resolve.alias.find((a) => a.find === `@/features/when-we-meet/${source}`);
    assert.equal(resolved?.replacement, path.join(root, 'src/stories/wwm', target));
    if (source !== 'api')
      assert.equal(resolved.find.test(`@/features/when-we-meet/${source}-extra`), false);
  }
  assert.equal(out.envDir, path.join(root, '.storybook/synthetic-env'));
  assert.equal(
    JSON.parse(out.define['process.env.NEXT_PUBLIC_SUPABASE_URL']),
    'https://storybook.invalid',
  );
  assert.ok(out.resolve.alias.some((a) => a.find === 'keep-existing'));
});
test('all real transport runtime exports have local implementations', () => {
  for (const [source, mock] of [
    ['date-api.ts', date()],
    ['date-confirmation-api.ts', confirm()],
  ]) {
    const text = fs.readFileSync(path.join(root, 'src/features/when-we-meet', source), 'utf8');
    for (const [, name] of text.matchAll(/export function (\w+)/g))
      assert.equal(typeof mock[name], 'function', name);
    assert.equal(typeof mock.ApiError, 'function');
  }
});
test('load is cloned, identity bounded and abort aware', async () => {
  init();
  const m = date();
  const value = await m.loadDateRoom(m.DATE_ROOM_ID);
  assert.equal(value.room.scheduleMode, 'date');
  assert.equal(value.room.startTime, null);
  assert.equal(value.room.endTime, null);
  value.responses[0].availableDates.length = 0;
  assert.ok(m.dateState.responses[0].availableDates.length);
  await assert.rejects(m.loadDateRoom('22222222-2222-4222-8222-222222222222'));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(m.loadDateRoom(m.DATE_ROOM_ID, controller.signal), { name: 'AbortError' });
});
test('save ACK retains raw microseconds, merges deltas and updates people', async () => {
  init();
  const m = date(),
    room = m.dateState.room,
    base = { name: 'Alex Sample', availableDates: [room.startDate] };
  m.dateState.responses[0].availableDates = [room.startDate, room.endDate];
  const ack = await m.saveDateResponse(room.id, 'Alex Renamed', [], base);
  assert.deepEqual(ack, {
    saved: true,
    value: {
      name: 'Alex Renamed',
      availableDates: [room.endDate],
      version: '2026-10-07T00:00:00.123457Z',
    },
  });
  assert.equal((await m.loadDateRoom(room.id)).responses[0].updatedAt, ack.value.version);
  assert.equal(shared.state.people[0].displayName, 'Alex Renamed');
  assert.equal(shared.state.people[0].hasAvailability, true);
});
test('28 day range is bounded, schedule trims all responses and reload matches ACK', async () => {
  init();
  const m = date();
  m.resetDateMock({ longRange: true });
  assert.equal(
    availability.datesInRange(m.dateState.room.startDate, m.dateState.room.endDate).length,
    28,
  );
  const schedule = {
    startDate: m.dateState.room.startDate,
    endDate: m.dateState.room.startDate,
    timezone: 'Asia/Seoul',
  };
  const previous = m.dateState.responses.reduce(
    (n, r) => n + r.availableDates.filter((d) => d !== schedule.startDate).length,
    0,
  );
  const ack = await m.updateDateRoomSchedule(m.DATE_ROOM_ID, schedule);
  assert.equal(ack.removedDates, previous);
  assert.deepEqual(ack.schedule, schedule);
  assert.equal((await m.loadDateRoom(m.DATE_ROOM_ID)).room.endDate, schedule.endDate);
  await assert.rejects(
    m.updateDateRoomSchedule(m.DATE_ROOM_ID, { ...schedule, endDate: '2027-12-31' }),
  );
});
test('failure preserves state, retry works and member schedule writes reject', async () => {
  init();
  const m = date(),
    before = structuredClone(m.dateState.responses);
  m.dateState.save = 'failure';
  await assert.rejects(
    m.saveDateResponse(m.DATE_ROOM_ID, 'Alex', [], { name: 'Alex Sample', availableDates: [] }),
  );
  assert.deepEqual(m.dateState.responses, before);
  m.dateState.save = 'success';
  await m.saveDateResponse(m.DATE_ROOM_ID, 'Alex', [], { name: 'Alex Sample', availableDates: [] });
  m.resetDateMock({ member: true });
  await assert.rejects(
    m.updateDateRoomSchedule(m.DATE_ROOM_ID, {
      startDate: m.dateState.room.startDate,
      endDate: m.dateState.room.endDate,
      timezone: 'UTC',
    }),
  );
  assert.equal(shared.state.people.find((p) => p.userId === m.MORGAN).isAdmin, true);
});
test('creation clock is injected and dynamic future room timezone dates reject stale input', async () => {
  init();
  const m = date();
  const clock = new Date('2030-12-31T16:00:00Z');
  const draft = m.futureDateDraft(clock);
  assert.equal(draft.form.startDate, '2031-01-02');
  const body = { ...draft.form, name: draft.name };
  delete body.startTime;
  delete body.endTime;
  assert.equal((await m.createDateRoom(body, clock)).id, m.DATE_ROOM_ID);
  await assert.rejects(m.createDateRoom({ ...body, startDate: '2030-12-31' }, clock));
  assert.deepEqual(await m.checkDateModeCapability(), { supported: true });
});
test('confirmation GET is schema faithful owner review with reserved synthetic addresses', async () => {
  init();
  const m = date(),
    c = confirm();
  const value = await c.getDateConfirmation(m.DATE_ROOM_ID);
  assert.equal(ui.normalizeDateReview(value, m.dateState.room, m.OWNER).status, null);
  assert.equal(value.review.attendees.length, 3);
  assert.ok(value.review.attendees.every((p) => p.email.endsWith('@example.invalid')));
  value.review.attendees.length = 0;
  assert.equal(c.confirmationState.review.attendees.length, 3);
});
test('local explicit send persists schema faithful confirmed owner snapshot without availability mutation', async () => {
  init();
  const m = date(),
    c = confirm();
  const rows = structuredClone(m.dateState.responses);
  assert.equal(c.confirmationState.posts.length, 0);
  assert.equal((await c.confirmDateMeetingRoute(m.DATE_ROOM_ID, input())).status, 'confirmed');
  const read = await c.getDateConfirmation(m.DATE_ROOM_ID);
  const normalized = ui.normalizeDateReview(read, m.dateState.room, m.OWNER);
  assert.equal(normalized.status.endDate, availability.nextCalendarDate(input().date));
  assert.equal(normalized.owner.root.valid.recipients[1].optional, true);
  assert.equal(c.confirmationState.posts.length, 1);
  assert.deepEqual(m.dateState.responses, rows);
  const next = { ...input(), date: m.dateState.room.endDate, revision: 2 };
  assert.equal((await c.updateDateMeetingRoute(m.DATE_ROOM_ID, next)).status, 'confirmed');
  assert.equal((await c.getDateConfirmation(m.DATE_ROOM_ID)).owner.root.valid.revision, 2);
  assert.equal((await c.resendDateMeetingRoute(m.DATE_ROOM_ID)).status, 'sent');
  assert.equal(c.confirmationState.resends, 1);
});
test('confirmation failure and held reads never mutate sent state; retry and reconcile remain local', async () => {
  init();
  const m = date(),
    c = confirm();
  c.confirmationState.send = 'failure';
  assert.equal((await c.confirmDateMeetingRoute(m.DATE_ROOM_ID, input())).status, 'failed');
  assert.equal((await c.getDateConfirmation(m.DATE_ROOM_ID)).status, null);
  c.confirmationState.send = 'reconciling';
  await c.confirmDateMeetingRoute(m.DATE_ROOM_ID, input());
  assert.equal((await c.reconcileDateMeetingRoute(m.DATE_ROOM_ID)).status, 'confirmed');
  c.confirmationState.load = 'pending';
  const controller = new AbortController();
  const held = c.getDateConfirmation(m.DATE_ROOM_ID, controller.signal);
  controller.abort();
  await assert.rejects(held, { name: 'AbortError' });
});
test('member review is redacted and send fails closed', async () => {
  init();
  date().resetDateMock({ member: true });
  confirm().resetDateConfirmationMock();
  const value = await confirm().getDateConfirmation(date().DATE_ROOM_ID);
  assert.equal(value.owner, null);
  assert.equal(value.review, null);
  ui.normalizeDateReview(value, date().dateState.room, date().OWNER);
  await assert.rejects(confirm().confirmDateMeetingRoute(date().DATE_ROOM_ID, input()));
});
test('reset discards previous story writes, held operations, failures and shared roster', async () => {
  init();
  const m = date(),
    c = confirm();
  m.dateState.load = 'failure';
  m.dateState.save = 'pending';
  c.confirmationState.resends = 9;
  c.confirmationState.load = 'failure';
  init();
  assert.equal(m.dateState.load, 'success');
  assert.equal(m.dateState.save, 'success');
  assert.equal(c.confirmationState.load, 'success');
  assert.equal(c.confirmationState.resends, 0);
  assert.equal(shared.state.people.length, 3);
});
test('date title ACK persists trimmed title across reloads', async () => {
  init();
  assert.equal(shared.calendar.rename, 'success');
  assert.deepEqual(await shared.renameRoom(date().DATE_ROOM_ID, '  Renamed day  '), { title: 'Renamed day' });
  for (let n = 0; n < 3; n++)
    assert.equal((await date().loadDateRoom(date().DATE_ROOM_ID)).room.title, 'Renamed day');
});
test('date title failure preserves saved title and retry persists', async () => {
  init();
  shared.calendar.rename = 'failure';
  await assert.rejects(shared.renameRoom(date().DATE_ROOM_ID, 'Rejected'), { status: 502 });
  assert.equal(date().dateState.room.title, 'Autumn planning day');
  shared.calendar.rename = 'success';
  await shared.renameRoom(date().DATE_ROOM_ID, 'Recovered');
  assert.equal((await date().loadDateRoom(date().DATE_ROOM_ID)).room.title, 'Recovered');
});
test('pending date title never ACKs or mutates after reset', async () => {
  init();
  shared.calendar.rename = 'pending';
  let settled = false;
  shared.renameRoom(date().DATE_ROOM_ID, 'Held').then(() => { settled = true; }, () => { settled = true; });
  await new Promise((resolve) => setTimeout(resolve, 230));
  assert.equal(settled, false);
  assert.equal(date().dateState.room.title, 'Autumn planning day');
  init();
  await new Promise((resolve) => setTimeout(resolve, 230));
  assert.equal(settled, false);
  assert.equal(date().dateState.room.title, 'Autumn planning day');
});
test('date title reset ABA rejects stale write without mutating new fixture', async () => {
  init();
  shared.calendar.rename = 'success';
  const operation = shared.renameRoom(date().DATE_ROOM_ID, 'Stale');
  const rejection = assert.rejects(operation, { status: 409 });
  await new Promise((resolve) => setTimeout(resolve, 30));
  date().resetDateMock({ member: true });
  init();
  await rejection;
  assert.equal(date().dateState.room.title, 'Autumn planning day');
});
test('immediate reset before dynamic import rejects stale date rename', async () => {
  init();
  const m = date();
  const stale = shared.renameRoom(m.DATE_ROOM_ID, 'Immediate-reset stale');
  const rejection = assert.rejects(stale, { status: 409 });
  // Intentionally no await or timer: reset within the import microtask gap.
  m.resetDateMock();
  await rejection;
  assert.equal(m.dateState.room.title, 'Autumn planning day');
});
test('immediate reset isolates old rename while new fixture rename succeeds', async () => {
  init();
  const m = date();
  const stale = shared.renameRoom(m.DATE_ROOM_ID, 'Stale concurrent title');
  const rejection = assert.rejects(stale, { status: 409 });
  m.resetDateMock();
  const fresh = shared.renameRoom(m.DATE_ROOM_ID, 'Fresh fixture title');
  const [, ack] = await Promise.all([rejection, fresh]);
  assert.deepEqual(ack, { title: 'Fresh fixture title' });
  assert.equal((await m.loadDateRoom(m.DATE_ROOM_ID)).room.title, 'Fresh fixture title');
});
test('date title validation and owner binding reject without mutation', async () => {
  init();
  shared.calendar.rename = 'success';
  for (const title of ['', '   ', 'x'.repeat(101), 'bad\u0000title', 'bad\ntitle', 'bad\u007ftitle'])
    await assert.rejects(shared.renameRoom(date().DATE_ROOM_ID, title), { status: 400 });
  await shared.renameRoom(date().DATE_ROOM_ID, 'x'.repeat(100));
  date().resetDateMock({ member: true });
  await assert.rejects(shared.renameRoom(date().DATE_ROOM_ID, 'Forbidden'), { status: 403 });
  init();
  date().dateState.room.ownerId = date().MORGAN;
  await assert.rejects(shared.renameRoom(date().DATE_ROOM_ID, 'Forbidden'), { status: 403 });
  init();
  const operation = shared.renameRoom(date().DATE_ROOM_ID, 'Lost authority');
  const rejection = assert.rejects(operation, { status: 403 });
  await new Promise((resolve) => setTimeout(resolve, 30));
  date().dateState.room.role = 'MEMBER';
  await rejection;
  assert.equal(date().dateState.room.title, 'Autumn planning day');
});
test('non-exact date IDs retain timed rename behavior without date mutation', async () => {
  init();
  shared.calendar.rename = 'success';
  date().dateState.room.role = 'MEMBER';
  for (const id of ['22222222-2222-4222-8222-222222222222', 'date-other', `${date().DATE_ROOM_ID}-extra`])
    assert.deepEqual(await shared.renameRoom(id, '  Timed  '), { title: 'Timed' });
  assert.equal(date().dateState.room.title, 'Autumn planning day');
});
test('date story copy keys exist in both dictionaries (structural, not browser proof)', () => {
  const source = fs.readFileSync(path.join(root, 'src/stories/wwm/date.stories.tsx'), 'utf8');
  for (const locale of ['en', 'ko']) {
    const dictionary = JSON.parse(
      fs.readFileSync(path.join(root, `src/i18n/locales/wwm/${locale}.json`), 'utf8'),
    );
    for (const [, key] of source.matchAll(
      /(?:storyCopy\(\)\.t|tab)\([^)]*?['"]((?:dateRoom|dateConfirm|dateSettings|common|room|people|errors|create|list)\.[\w.]+)['"]/g,
    )) {
      assert.equal(
        typeof key.split('.').reduce((value, part) => value?.[part], dictionary),
        'string',
        `${locale}:${key}`,
      );
    }
  }
});
test('network-free execution and source guard (structural, not browser proof)', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = () => {
    requests++;
    throw Error('Network forbidden');
  };
  try {
    init();
    await date().loadDateRoom(date().DATE_ROOM_ID);
    await confirm().getDateConfirmation(date().DATE_ROOM_ID);
    await confirm().confirmDateMeetingRoute(date().DATE_ROOM_ID, input());
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = original;
  }
  for (const file of ['mock-date-api.ts', 'mock-date-confirmation-api.ts']) {
    const source = fs.readFileSync(path.join(root, 'src/stories/wwm', file), 'utf8');
    const runtime = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    assert.doesNotMatch(
      runtime,
      /\bfetch\s*\(|\brequest\s*\(|supabase|node:crypto|from ['"][^'"]*\/date-(?:confirmation-)?api['"]/,
    );
  }
  const preview = fs.readFileSync(path.join(root, '.storybook/preview.tsx'), 'utf8');
  assert.match(preview, /url\.includes\('\/api\/craft\/'\)/);
  assert.match(preview, /url\.includes\('supabase'\)/);
  const stories = fs.readFileSync(path.join(root, 'src/stories/wwm/date.stories.tsx'), 'utf8');
  assert.match(stories, /import DateWhenWeMeet from/);
  assert.match(stories, /import WhenWeMeet from/);
  assert.match(stories, /resetDateMock/);
  assert.match(stories, /resetDateConfirmationMock/);
  for (const name of [
    'OwnerAvailability',
    'Everyone',
    'People',
    'ConfirmOwner',
    'ConfirmReview',
    'ConfirmSend',
    'Share',
    'SettingsOwner',
    'SettingsMember',
    'MonthBoundary28Days',
    'ResponsesLoading',
    'ResponsesError',
    'CreateDate',
  ])
    assert.match(stories, new RegExp(`export const ${name}\\b`));
});
