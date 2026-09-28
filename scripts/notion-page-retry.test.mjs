import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import test, { beforeEach } from 'node:test';
import { isNotionNotFound, withNotionPageRetry } from '../src/utils/notion/fetchNotionPage.ts';

let testClock = Math.floor(Date.now() / 1000) * 1000;
beforeEach((context) => {
  testClock += 3_600_000;
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: testClock });
});

const failure = (status, retryAfter) =>
  Object.assign(new Error(`Notion HTTP ${status}`), {
    response: {
      status,
      headers: new Headers(retryAfter ? { 'retry-after': retryAfter } : {}),
    },
  });

test('cold-cache callers share one request and settled requests are released', async (context) => {
  let finish;
  let calls = 0;
  const load = () => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const first = withNotionPageRetry('ABC-123', load);
  const second = withNotionPageRetry('abc123', load);
  assert.equal(first, second);
  await setImmediate();
  assert.equal(calls, 1);
  finish({ block: {} });
  assert.deepEqual(await first, { block: {} });
  const next = withNotionPageRetry('abc123', async () => {
    calls++;
    return { block: {} };
  });
  await setImmediate();
  context.mock.timers.tick(750);
  await next;
  assert.equal(calls, 2);
});

test('429 respects Retry-After before succeeding', async (context) => {
  let calls = 0;
  const request = withNotionPageRetry('retry-after', async () => {
    calls++;
    if (calls === 1) throw failure(429, '2');
    return { block: {} };
  });
  await setImmediate();
  context.mock.timers.tick(1999);
  await setImmediate();
  assert.equal(calls, 1);
  context.mock.timers.tick(1);
  assert.deepEqual(await request, { block: {} });
  assert.equal(calls, 2);
});

test('transient failures retry twice and release failed requests', async (context) => {
  const error = failure(503, '10');
  let calls = 0;
  const request = withNotionPageRetry('retry-cap', async () => {
    calls++;
    throw error;
  });
  const rejected = assert.rejects(request, (actual) => actual === error);
  await setImmediate();
  context.mock.timers.tick(9999);
  await setImmediate();
  assert.equal(calls, 1);
  context.mock.timers.tick(1);
  await setImmediate();
  assert.equal(calls, 2);
  context.mock.timers.tick(10000);
  await rejected;
  assert.equal(calls, 3);
  assert.deepEqual(await withNotionPageRetry('retry-cap', async () => ({ block: {} })), {
    block: {},
  });
});

test('404 is not retried and transient failures cannot be classified as not-found', async () => {
  let calls = 0;
  const missing = failure(404);
  await assert.rejects(
    withNotionPageRetry('missing', async () => {
      calls++;
      throw missing;
    }),
    (error) => error === missing,
  );
  assert.equal(calls, 1);
  assert.equal(isNotionNotFound(missing), true);
  assert.equal(isNotionNotFound(new Error('Notion page not found "abc"')), true);
  assert.equal(isNotionNotFound(new Error('invalid notion pageId "abc"')), true);
  assert.equal(
    isNotionNotFound(Object.assign(failure(429), { message: 'Notion page not found "abc"' })),
    false,
  );
  assert.equal(isNotionNotFound(failure(400)), false);
  assert.equal(isNotionNotFound(new Error('network failed')), false);
});

test('large Retry-After fails without sending an early retry', async () => {
  let calls = 0;
  const error = failure(429, '600');
  await assert.rejects(
    withNotionPageRetry('long-cooldown', async () => {
      calls++;
      throw error;
    }),
    (actual) => actual === error,
  );
  assert.equal(calls, 1);
  await assert.rejects(
    withNotionPageRetry('another-during-cooldown', async () => {
      calls++;
      return { block: {} };
    }),
    (actual) => actual === error,
  );
  assert.equal(calls, 1);
});

test('different cold pages are serialized and spaced apart', async (context) => {
  const starts = [];
  const load = async () => {
    starts.push(Date.now());
    return { block: {} };
  };
  const first = withNotionPageRetry('queue-first', load);
  const second = withNotionPageRetry('queue-second', load);
  await first;
  await setImmediate();
  assert.equal(starts.length, 1);
  context.mock.timers.tick(749);
  await setImmediate();
  assert.equal(starts.length, 1);
  context.mock.timers.tick(1);
  await second;
  assert.equal(starts[1] - starts[0], 750);
});

test('Retry-After HTTP dates are honored', async (context) => {
  let calls = 0;
  const retryAt = new Date(Date.now() + 2000).toUTCString();
  const request = withNotionPageRetry('date-retry', async () => {
    calls++;
    if (calls === 1) throw failure(503, retryAt);
    return { block: {} };
  });
  await setImmediate();
  context.mock.timers.tick(1999);
  await setImmediate();
  assert.equal(calls, 1);
  context.mock.timers.tick(1);
  await request;
  assert.equal(calls, 2);
});
