import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith('@/')
      ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier;
    return nextResolve(target, context);
  },
});

const { ANALYTICS_EVENTS, GA_MEASUREMENT_ID } = await import('../src/constants/analytics.ts');
const { reportWebVital } = await import('../src/utils/webVitals.ts');
let metricSequence = 0;

function metric(overrides = {}) {
  return {
    name: 'LCP',
    id: `web-vitals-test-${++metricSequence}`,
    value: 1234.56,
    delta: 1234.56,
    rating: 'good',
    navigationType: 'navigate',
    ...overrides,
  };
}

function withBrowser(
  run,
  {
    navigation = 'https://hyeok.dev/initial-article?token=private-navigation#private-fragment',
  } = {},
) {
  globalThis.window = {
    location: new URL('https://hyeok.dev/gallery?email=private@example.com#private-current'),
    navigator: { userAgent: 'test', platform: 'test', language: 'ko-KR', onLine: true },
    innerWidth: 1280,
    innerHeight: 720,
    performance: {
      getEntriesByType: (name) =>
        name === 'navigation' && navigation ? [{ name: navigation }] : [],
    },
  };
  globalThis.document = {
    documentElement: { dataset: { design: 'sweet-home', mode: 'light' } },
  };
  try {
    return run();
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
}

function commands() {
  return (window.dataLayer || []).map((entry) => Array.from(entry));
}

function events() {
  return commands().filter(
    ([command, name]) => command === 'event' && name === ANALYTICS_EVENTS.WEB_VITAL,
  );
}

test('reporting is safe during SSR and does not consume the first browser measurement', () => {
  const sample = metric();
  assert.doesNotThrow(() => reportWebVital(sample));
  withBrowser(() => {
    reportWebVital(sample);
    assert.equal(events().length, 1);
  });
});

test('first vital queues after GA configuration before the remote SDK is available', () => {
  withBrowser(() => {
    const sample = metric({ value: 1234.56, delta: 567.89, rating: 'needs-improvement' });
    reportWebVital(sample);
    assert.deepEqual(
      commands().map(([command]) => command),
      ['js', 'config', 'event'],
    );
    assert.equal(commands()[1][1], GA_MEASUREMENT_ID);
    assert.equal(ANALYTICS_EVENTS.WEB_VITAL, 'web_vital');
    const parameters = events()[0][2];
    assert.equal(parameters.metric_name, 'LCP');
    assert.equal(parameters.metric_id, sample.id);
    assert.equal(parameters.metric_value, 1234.56);
    assert.equal(parameters.metric_delta, 567.89);
    assert.equal(parameters.metric_rating, 'needs-improvement');
    assert.equal(parameters.metric_unit, 'ms');
    assert.equal(parameters.value, 1235);
    assert.equal(parameters.navigation_type, 'navigate');
    assert.equal(parameters.measurement_source, 'next_web_vitals');
    assert.equal(parameters.non_interaction, true);
    assert.equal(parameters.transport_type, 'beacon');
    assert.equal(parameters.send_to, GA_MEASUREMENT_ID);
    assert.ok(Object.keys(parameters).length <= 25, 'vital event exceeds GA parameter limit');
  });
});

test('CLS preserves the raw score and delta while scaling only the GA value', () => {
  withBrowser(() => {
    reportWebVital(metric({ name: 'CLS', value: 0.123, delta: 0.023, rating: 'poor' }));
    const parameters = events()[0][2];
    assert.equal(parameters.metric_value, 0.123);
    assert.equal(parameters.metric_delta, 0.023);
    assert.equal(parameters.metric_unit, 'score');
    assert.equal(parameters.value, 123);
  });
});

test('supported timings use milliseconds and finite negative deltas remain valid', () => {
  withBrowser(() => {
    for (const name of ['FCP', 'LCP', 'INP', 'TTFB']) {
      reportWebVital(
        metric({ name, value: 45.2, delta: -2.1, navigationType: 'back-forward-cache' }),
      );
    }
    assert.equal(events().length, 4);
    for (const [, , parameters] of events()) {
      assert.equal(parameters.metric_unit, 'ms');
      assert.equal(parameters.metric_delta, -2.1);
      assert.equal(parameters.value, 45);
      assert.equal(parameters.navigation_type, 'back-forward-cache');
    }
  });
});

test('unknown names, invalid values and nonfinite deltas never enter the GA queue', () => {
  withBrowser(() => {
    const invalid = [
      { name: 'UNKNOWN' },
      { name: 'lcp' },
      { value: -1 },
      { value: NaN },
      { value: Infinity },
      { value: -Infinity },
      { delta: NaN },
      { delta: Infinity },
      { delta: -Infinity },
    ];
    for (const values of invalid) reportWebVital(metric(values));
    assert.equal(events().length, 0);
    reportWebVital(metric({ name: 'CLS', value: 0, delta: 0 }));
    assert.equal(events().length, 1, 'zero is a valid measurement');
  });
});

test('exact duplicates are suppressed while updated values and deltas are delivered', () => {
  withBrowser(() => {
    const sample = metric();
    reportWebVital(sample);
    reportWebVital({ ...sample });
    reportWebVital({ ...sample, value: sample.value + 100 });
    reportWebVital({ ...sample, value: sample.value + 100 });
    reportWebVital({ ...sample, value: sample.value + 100, delta: 100 });
    reportWebVital({ ...sample, name: 'FCP' });
    assert.equal(events().length, 4);
    assert.deepEqual(
      events().map(([, , parameters]) => [
        parameters.metric_name,
        parameters.metric_value,
        parameters.metric_delta,
      ]),
      [
        ['LCP', sample.value, sample.delta],
        ['LCP', sample.value + 100, sample.delta],
        ['LCP', sample.value + 100, 100],
        ['FCP', sample.value, sample.delta],
      ],
    );
  });
});

test('deduplication storage is bounded and expired metric identities can be reported again', () => {
  withBrowser(() => {
    const first = metric();
    reportWebVital(first);
    for (let index = 0; index < 256; index++) reportWebVital(metric());
    reportWebVital(first);
    assert.equal(
      events().length,
      258,
      'the oldest identity should expire after 256 newer identities',
    );
  });
});

test('metric attribution keeps the initial document route after SPA navigation and strips private URL parts', () => {
  withBrowser(() => {
    const sample = metric({
      entries: [{ name: 'https://private-entry.example/file?secret=entry-secret' }],
    });
    reportWebVital(sample);
    const parameters = events()[0][2];
    assert.equal(parameters.metric_page_path, '/initial-article');
    assert.equal(parameters.page_path, '/gallery');
    assert.equal(parameters.page_location, 'https://hyeok.dev/gallery');
    const serialized = JSON.stringify(parameters);
    for (const secret of [
      'private-navigation',
      'private-fragment',
      'private@example.com',
      'private-current',
      'private-entry',
      'entry-secret',
    ]) {
      assert.equal(serialized.includes(secret), false, `event leaks ${secret}`);
    }
    assert.equal(Object.hasOwn(parameters, 'entries'), false);
  });
});

test('missing navigation timing uses the current sanitized document path', () => {
  withBrowser(
    () => {
      reportWebVital(metric());
      assert.equal(events()[0][2].metric_page_path, '/gallery');
    },
    { navigation: null },
  );
  withBrowser(
    () => {
      delete window.performance;
      assert.doesNotThrow(() => reportWebVital(metric()));
      assert.equal(events()[0][2].metric_page_path, '/gallery');
    },
    { navigation: null },
  );
});
