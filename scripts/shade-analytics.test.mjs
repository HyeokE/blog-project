import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${file}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, { URLSearchParams, Error, AbortSignal, ...globals })(
    name => { if (name in imports) return imports[name]; throw new Error(`Unexpected import ${name}`); }, module, module.exports,
  );
  return module.exports;
}
const constants = load('constants/analytics.ts');
const contracts = load('features/shade-finder/public-contracts.ts');
const uuid = index => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
const plain = value => JSON.parse(JSON.stringify(value));
function setup(sink) {
  const events = [];
  const analytics = load('features/shade-finder/analytics.ts', {
    '@/constants/analytics': constants,
    '@/utils/analytics': { trackEvent: sink ?? ((event, params) => events.push({ event, ...plain(params) })) },
    './public-contracts': contracts,
  });
  return { events, analytics };
}

test('action allowlist retains public catalog values and drops arbitrary inputs', () => {
  const { analytics, events } = setup();
  analytics.trackShadeAction('shade_select', { shadeId: uuid(1), shadeName: '21호', hex: '#AABBCC', query: 'private@example.com', token: 'secret', sourceUrl: 'https://private.invalid' });
  analytics.trackShadeAction('made_up', { shadeId: uuid(1) });
  analytics.trackShadeAction('picker_search', { field: 'brand', searchLength: 5, hasSearch: true });
  assert.equal(events.length, 2);
  assert.deepEqual(events[0], { event: 'shade_action', action: 'shade_select', shadeId: uuid(1), shadeName: '21호', hex: '#aabbcc' });
  assert.equal(JSON.stringify(events).includes('private'), false);
  assert.equal(events[1].searchLength, 5);
});

test('URL context never sends search contents, URLs, arbitrary types or legacy ids', () => {
  const { analytics, events } = setup();
  const url = `/api/craft/shade-finder/matches?shadeId=${uuid(2)}&brandId=legacy&type=cushion&offset=6&q=private%40example.com&token=secret`;
  analytics.trackShadeResults(url, 20, 12);
  analytics.trackShadeRequest('matches', url, 'error', 503, 32, 'http');
  assert.equal(events[0].shadeId, uuid(2));
  assert.equal(events[0].productType, 'cushion');
  assert.equal(events[1].status, 503);
  for (const event of events) {
    assert.ok(Object.keys(event).length <= 11);
    assert.doesNotMatch(JSON.stringify(event), /private|legacy|secret|\/api\//);
  }
});

test('impressions include only one displayed catalog result and stay within payload budget', () => {
  const { analytics, events } = setup();
  analytics.trackShadeImpression(uuid(1), {
    product: { id: uuid(2), name: '쿠션', nameEn: 'Cushion', type: 'cushion' },
    shade: { id: uuid(3), name: '21호', hex: '#e5bda0' }, brandName: '테스트', deltaE: 0.41,
    ignored: 'secret',
  }, 2);
  assert.equal(events[0].position, 2);
  assert.equal(events[0].deltaE, 0.41);
  assert.equal(Object.keys(events[0]).length, 11);
  assert.equal(events[0].ignored, undefined);
  analytics.trackShadeExit('results', 100.4);
  assert.equal(events[1].durationMs, 100);
  assert.equal(events[1].transport_type, 'beacon');
});

test('a failing analytics sink cannot interrupt actions or request results', async () => {
  const { analytics } = setup(() => { throw new Error('analytics unavailable'); });
  assert.doesNotThrow(() => analytics.trackShadeAction('view'));
  const queries = load('features/shade-finder/queries.ts', { './analytics': analytics, './public-contracts': contracts }, {
    fetch: async () => ({ ok: true, status: 200, json: async () => ({ products: [] }) }),
  });
  assert.deepEqual(plain(await queries.requestShadeData('products', '/api/craft/shade-finder/products')), { products: [] });
});

test('actual requests log once; cache reuse does not log; explicit retry starts a new request', async () => {
  const { analytics, events } = setup();
  let calls = 0;
  const queries = load('features/shade-finder/queries.ts', { './analytics': analytics, './public-contracts': contracts }, {
    fetch: async () => { calls++; return { ok: true, status: 200, json: async () => ({ products: [] }) }; },
  });
  const url = `/api/craft/shade-finder/products?brandId=${uuid(1)}`;
  const first = queries.requestShadeData('products', url);
  assert.equal(queries.requestShadeData('products', url), first);
  await first;
  await queries.requestShadeData('products', url);
  assert.equal(calls, 1);
  assert.equal(events.length, 1);
  assert.equal(events[0].result, 'ok');
  assert.equal(events[0].brandId, uuid(1));
  queries.retryShadeData(url);
  await queries.requestShadeData('products', url);
  assert.equal(calls, 2);
  assert.equal(events.length, 2);
});

for (const kind of ['http', 'network', 'timeout', 'validation']) {
  test(`request ${kind} failure logs category without body or exception text`, async () => {
    const { analytics, events } = setup();
    const queries = load('features/shade-finder/queries.ts', { './analytics': analytics, './public-contracts': contracts }, {
      fetch: async () => {
        if (kind === 'network' || kind === 'timeout') {
          const error = new Error('private@example.com token secret');
          if (kind === 'timeout') error.name = 'TimeoutError';
          throw error;
        }
        return { ok: kind !== 'http', status: kind === 'http' ? 503 : 200, json: async () => ({ invalid: 'secret' }) };
      },
    });
    const url = '/api/craft/shade-finder/products';
    await assert.rejects(queries.requestShadeData('products', url));
    await assert.rejects(queries.requestShadeData('products', url));
    assert.equal(events.length, 1);
    assert.equal(events[0].failure, kind);
    assert.doesNotMatch(JSON.stringify(events), /private|secret/);
  });
}

test('complete GA event including shared environment stays below 25 parameters', () => {
  const window = { location: new URL('https://hyeok.dev/craft/shade-finder'), navigator: { userAgent: 'test', platform: 'test', language: 'ko-KR', onLine: true }, innerWidth: 390, innerHeight: 844 };
  const document = { documentElement: { dataset: { design: 'light', mode: 'light' } } };
  const environment = load('utils/analyticsEnvironment.ts', {}, { window });
  const actualSink = load('utils/analytics.ts', { '@/constants/analytics': constants, '@/utils/analyticsEnvironment': environment }, { window, document, URL });
  const { analytics } = setup(actualSink.trackEvent);
  analytics.trackShadeImpression(uuid(1), { product: { id: uuid(2), name: '쿠션', nameEn: '', type: 'cushion' }, shade: { id: uuid(3), name: '21호', hex: '#e5bda0' }, brandName: '테스트', deltaE: 0.41 }, 1);
  analytics.trackShadeExit('brand', 100);
  analytics.trackShadeExit('product', 120);
  const events = window.dataLayer.map(value => Array.from(value)).filter(value => value[0] === 'event');
  assert.equal(events.length, 3);
  assert.equal(Object.keys(events[0][2]).length, 23);
  assert.equal(events[0][2].page_name, 'shade_finder');
  assert.ok(events.every(value => Object.keys(value[2]).length <= 25));
});

test('photo events and requests do not log photos or extracted skin colors', () => {
  const { analytics, events } = setup();
  analytics.trackShadeAction('photo_region_select');
  const url = '/api/craft/shade-finder/matches?hex=%23a1b2c3&type=cushion&offset=0';
  analytics.trackShadeRequest('matches', url, 'ok', 200, 25);
  analytics.trackShadeResults(url, 10, 6);
  analytics.trackShadeImpression(undefined, {
    product: { id: uuid(2), name: '쿠션', nameEn: 'Cushion', type: 'cushion' },
    shade: { id: uuid(3), name: '21호', hex: '#e5bda0' }, brandName: '테스트', deltaE: 1.4,
  }, 1);
  assert.equal(events.length, 4);
  assert.equal(events[1].sourceType, 'photo');
  assert.equal(events[3].sourceType, 'photo');
  assert.doesNotMatch(JSON.stringify(events), /a1b2c3|\/api\//);
  assert.equal(events[3].selectedShadeId, undefined);
});

test('white-reference selection logs an action without sampled color data', () => {
  const { analytics, events } = setup();
  analytics.trackShadeAction('photo_white_reference_select');
  assert.deepEqual(events, [{ event: 'shade_action', action: 'photo_white_reference_select' }]);
});
