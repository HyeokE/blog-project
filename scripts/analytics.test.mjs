import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

// Resolve the application's TypeScript alias without changing production imports.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const target = specifier.startsWith('@/')
      ? new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href
      : specifier;
    return nextResolve(target, context);
  },
});

const { ANALYTICS_ACTIONS, ANALYTICS_EVENTS, GA_MEASUREMENT_ID } =
  await import('../src/constants/analytics.ts');
const { analyticsLabel, analyticsUrl, initializeAnalytics, trackEvent, trackInteraction } =
  await import('../src/utils/analytics.ts');

test('analytics is safe during server rendering', () => {
  assert.doesNotThrow(() => initializeAnalytics());
  assert.doesNotThrow(() => trackInteraction(ANALYTICS_ACTIONS.SEARCH_OPEN));
});

test('early interactions queue after configuration; repeated initialization does not duplicate it', () => {
  globalThis.window = {
    location: new URL('https://hyeok.dev/2026/about?email=private@example.com#contact'),
    navigator: { userAgent: 'test', platform: 'test', language: 'ko-KR', onLine: true },
    innerWidth: 1280,
    innerHeight: 720,
  };
  globalThis.document = { documentElement: { dataset: { design: 'cloud', mode: 'light' } } };
  try {
    trackInteraction(ANALYTICS_ACTIONS.SEARCH_OPEN, { method: 'keyboard' });
    initializeAnalytics();
    trackEvent(ANALYTICS_EVENTS.PAGE_LOAD);
    const commands = window.dataLayer.map((entry) => Array.from(entry));
    assert.deepEqual(
      commands.map((command) => command[0]),
      ['js', 'config', 'event', 'event'],
    );
    assert.equal(commands[1][1], GA_MEASUREMENT_ID);
    const parameters = commands[2][2];
    assert.equal(parameters.action, ANALYTICS_ACTIONS.SEARCH_OPEN);
    assert.equal(parameters.page_path, '/2026/about');
    assert.equal(parameters.page_location, 'https://hyeok.dev/2026/about');
    assert.equal(parameters.design_theme, 'cloud');
    assert.equal(JSON.stringify(parameters).includes('private@example.com'), false);
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
});

test('link metadata strips query, hash, credentials and contact addresses', () => {
  const base = 'https://hyeok.dev';
  assert.equal(analyticsUrl('/about?token=secret#private', base), `${base}/about`);
  assert.equal(
    analyticsUrl('https://user:password@example.com/file?q=secret', base),
    'https://example.com/file',
  );
  assert.equal(analyticsUrl('mailto:private@example.com?subject=secret', base), 'mailto:');
  assert.equal(analyticsUrl('tel:+821012345678', base), 'tel:');
  assert.equal(analyticsUrl('javascript:alert(1)', base), '');
  assert.equal(analyticsUrl('http://[invalid', base), '');
});

test('labels redact email addresses and cap event parameter length', () => {
  assert.equal(analyticsLabel('  Contact\n me@example.com  '), 'Contact [email]');
  assert.equal(analyticsLabel('x'.repeat(200)).length, 100);
});

const { getCommonEnvironment, getDetailedEnvironment, getNetworkConnection } =
  await import('../src/utils/analyticsEnvironment.ts');

function withBrowser(run, overrides = {}) {
  globalThis.window = {
    location: new URL('https://user:password@hyeok.dev/about?token=private-query#private-hash'),
    navigator: {
      userAgent: 'Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.3485.54',
      platform: 'MacIntel',
      language: 'ko-KR',
      languages: ['ko-KR', 'en-US'],
      onLine: true,
      cookieEnabled: true,
      maxTouchPoints: 0,
      hardwareConcurrency: 8,
      deviceMemory: 8,
      userAgentData: {
        mobile: false,
        platform: 'macOS',
        brands: [{ brand: 'Microsoft Edge', version: '140' }],
      },
      connection: {
        effectiveType: '4g',
        type: 'wifi',
        downlink: 12.5,
        downlinkMax: 100,
        rtt: 35,
        saveData: false,
      },
    },
    innerWidth: 1440,
    innerHeight: 900,
    screen: {
      width: 2560,
      height: 1600,
      availWidth: 2560,
      availHeight: 1540,
      colorDepth: 24,
      orientation: { type: 'landscape-primary' },
    },
    devicePixelRatio: 2,
    isSecureContext: true,
    matchMedia: (query) => ({ matches: query === '(pointer: fine)' }),
    performance: { getEntriesByType: () => [{ type: 'navigate' }] },
    ...overrides,
  };
  globalThis.document = {
    documentElement: { dataset: { design: 'sweet-home', mode: 'dark' } },
    visibilityState: 'visible',
    referrer: 'https://user:password@example.com/from?email=private@example.com#private',
  };
  try {
    return run();
  } finally {
    delete globalThis.window;
    delete globalThis.document;
  }
}

test('all environment events include actual measurements and stay within GA parameter limits', () => {
  withBrowser(() => {
    const details = getDetailedEnvironment();
    const groups = [
      [ANALYTICS_EVENTS.ENVIRONMENT_BROWSER, details.browser],
      [ANALYTICS_EVENTS.ENVIRONMENT_DEVICE, details.device],
      [
        ANALYTICS_EVENTS.ENVIRONMENT_NETWORK,
        {
          ...details.network,
          referrer_url: analyticsUrl(document.referrer, window.location.origin),
        },
      ],
    ];
    for (const [name, parameters] of groups) trackEvent(name, parameters);
    const events = window.dataLayer
      .map((entry) => Array.from(entry))
      .filter(([command]) => command === 'event');
    assert.deepEqual(
      events.map(([, name]) => name),
      groups.map(([name]) => name),
    );
    for (const [, name, parameters] of events) {
      assert.ok(Object.keys(parameters).length <= 25, `${name} exceeds 25 parameters`);
      assert.equal(parameters.send_to, GA_MEASUREMENT_ID);
      assert.equal(parameters.app_device_type, 'desktop');
      assert.equal(parameters.viewport_width, 1440);
      assert.equal(parameters.network_type, '4g');
      assert.equal(parameters.online, true);
      assert.equal(parameters.design_theme, 'sweet-home');
      assert.equal(parameters.page_location, 'https://hyeok.dev/about');
      const serialized = JSON.stringify(parameters);
      for (const secret of ['password', 'private-query', 'private-hash', 'private@example.com']) {
        assert.equal(serialized.includes(secret), false, `${name} leaks ${secret}`);
      }
    }
    assert.equal(events[0][2].browser_name, 'Edge');
    assert.equal(events[0][2].browser_version, '140.0.3485.54');
    assert.equal(events[1][2].screen_width, 2560);
    assert.equal(events[1][2].cpu_threads, 8);
    assert.equal(events[1][2].device_memory_gb, 8);
    assert.equal(events[2][2].downlink_mbps, 12.5);
    assert.equal(events[2][2].network_rtt_ms, 35);
    assert.equal(events[2][2].save_data, false);
    assert.equal(events[2][2].referrer_url, 'https://example.com/from');
  });
});

test('missing optional browser APIs remain unknown instead of fabricated measurements', () => {
  withBrowser(() => {
    for (const name of ['connection', 'userAgentData', 'hardwareConcurrency', 'deviceMemory']) {
      delete window.navigator[name];
    }
    delete window.performance;
    delete window.matchMedia;
    delete window.screen.orientation;
    assert.equal(getNetworkConnection(), undefined);
    let details;
    assert.doesNotThrow(() => {
      details = getDetailedEnvironment();
    });
    assert.equal(getCommonEnvironment().network_type, 'unknown');
    for (const name of ['cpu_threads', 'device_memory_gb']) {
      assert.equal(Object.hasOwn(details.device, name), false);
    }
    for (const name of ['downlink_mbps', 'max_downlink_mbps', 'network_rtt_ms', 'save_data']) {
      assert.equal(Object.hasOwn(details.network, name), false);
    }
    for (const [group, name] of [
      [details.browser, 'reduced_motion'],
      [details.browser, 'preferred_color_scheme'],
      [details.browser, 'display_mode'],
      [details.device, 'pointer_type'],
    ]) {
      assert.ok(group[name] === undefined || group[name] === 'unknown', `${name} must be unknown`);
    }
    assert.equal(details.network.document_navigation_type, 'unknown');
  });
});

test('device category distinguishes tablet, mobile hints, and desktop without screen-size guessing', () => {
  const cases = [
    {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)',
      maxTouchPoints: 5,
      expected: 'tablet',
    },
    {
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)',
      maxTouchPoints: 5,
      expected: 'tablet',
    },
    { userAgent: 'Mozilla/5.0 (Linux; Android 14; Tablet) Chrome/140.0', expected: 'tablet' },
    {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/140.0 Mobile Safari/537.36',
      expected: 'mobile',
    },
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', expected: 'mobile' },
    { userAgent: 'Reduced UA', userAgentData: { mobile: true }, expected: 'mobile' },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)', expected: 'desktop' },
  ];
  withBrowser(() => {
    for (const { expected, ...navigator } of cases) {
      window.navigator = { language: 'ko-KR', onLine: true, maxTouchPoints: 0, ...navigator };
      window.innerWidth = 360;
      assert.equal(getCommonEnvironment().app_device_type, expected, navigator.userAgent);
    }
  });
});

test('unavailable or invalid connection metrics are not reported as zero', () => {
  withBrowser(() => {
    window.navigator.connection = { downlink: NaN, downlinkMax: Infinity, rtt: undefined };
    const { network } = getDetailedEnvironment();
    assert.equal(network.connection_type, 'unknown');
    for (const name of ['downlink_mbps', 'max_downlink_mbps', 'network_rtt_ms', 'save_data']) {
      assert.equal(Object.hasOwn(network, name), false);
    }
    const legacyConnection = { effectiveType: '3g' };
    delete window.navigator.connection;
    window.navigator.webkitConnection = legacyConnection;
    assert.equal(getNetworkConnection(), legacyConnection);
    assert.equal(getCommonEnvironment().network_type, '3g');
  });
});

test('environment helpers are safe on the server and event constants meet GA naming limits', () => {
  assert.deepEqual(getCommonEnvironment(), {});
  assert.deepEqual(getDetailedEnvironment(), { browser: {}, device: {}, network: {} });
  assert.equal(getNetworkConnection(), undefined);
  for (const constants of [ANALYTICS_EVENTS, ANALYTICS_ACTIONS]) {
    const names = Object.values(constants);
    assert.equal(new Set(names).size, names.length);
    for (const name of names) {
      assert.match(name, /^[a-z][a-z0-9_]{0,39}$/);
    }
  }
});
