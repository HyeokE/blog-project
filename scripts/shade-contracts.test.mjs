import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, imports = {}, globals = {}) {
  const source = readFileSync(new URL(`../src/features/shade-finder/${file}`, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${code}\n})`, globals, { filename: file })(
    name => {
      if (name in imports) { return imports[name]; }
      throw new Error(`Unexpected import ${name}`);
    }, module, module.exports,
  );
  return module.exports;
}

const contracts = load('public-contracts.ts');
const {
  parseShadeFinderBootstrap,
  parseProductsResponse,
  parseShadesResponse,
  parseMatchesResponse,
} = contracts;
const plain = value => JSON.parse(JSON.stringify(value));
const uuid = value => `00000000-0000-4000-8000-${value.toString(16).padStart(12, '0')}`;
const fixtureBrand = () => ({ id: uuid(1), name: '브랜드', nameEn: 'Brand', types: ['foundation', 'cushion'] });
const fixtureProduct = () => ({ id: uuid(10), name: '파운데이션', nameEn: '', type: 'foundation' });
const fixtureShade = () => ({ id: uuid(100), name: '21호', hex: '#e5bda0' });
const fixtureMatch = (index = 0) => ({
  product: { ...fixtureProduct(), id: uuid(1000 + index) },
  brandName: '브랜드',
  shade: { ...fixtureShade(), id: uuid(2000 + index) },
  deltaE: 0.41 + index,
});
const bootstrap = () => ({
  brands: [fixtureBrand()],
  example: { brand: fixtureBrand(), product: fixtureProduct(), shade: fixtureShade() },
});
const page = () => ({ matches: Array.from({ length: 6 }, (_, index) => fixtureMatch(index)), total: 13, nextOffset: 6 });

test('all public decoders accept valid DTOs, including empty lists and null bootstrap examples', () => {
  for (const [parse, input] of [
    [parseShadeFinderBootstrap, bootstrap()],
    [parseShadeFinderBootstrap, { brands: [], example: null }],
    [parseProductsResponse, { products: [fixtureProduct()] }],
    [parseProductsResponse, { products: [] }],
    [parseShadesResponse, { shades: [fixtureShade()] }],
    [parseShadesResponse, { shades: [] }],
    [parseMatchesResponse, page()],
    [parseMatchesResponse, { matches: [fixtureMatch()], total: 13, nextOffset: null }],
    [parseMatchesResponse, { matches: [], total: 0, nextOffset: null }],
  ]) {
    assert.deepEqual(plain(parse(input)), input);
  }
  assert.equal(parseShadesResponse({ shades: [{ ...fixtureShade(), hex: '#E5BDA0' }] }).shades[0].hex, '#e5bda0');
});

test('public IDs accept only canonical UUIDv4 values and reject source identifiers', () => {
  const invalidIds = ['B1', 'B1:P1', 'B1:P1:S1', 'source_123', '', null, 1,
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-7000-8000-000000000001',
    '00000000-0000-4000-7000-000000000001',
    '00000000-0000-4000-8000-00000000000A',
    uuid(1).replaceAll('-', '')];
  for (const id of invalidIds) {
    assert.throws(() => parseShadeFinderBootstrap({ brands: [{ ...fixtureBrand(), id }], example: null }), /Invalid shade response/);
    assert.throws(() => parseProductsResponse({ products: [{ ...fixtureProduct(), id }] }), /Invalid shade response/);
    assert.throws(() => parseShadesResponse({ shades: [{ ...fixtureShade(), id }] }), /Invalid shade response/);
    assert.throws(() => parseMatchesResponse({ matches: [{ ...fixtureMatch(), shade: { ...fixtureShade(), id } }], total: 1, nextOffset: null }), /Invalid shade response/);
  }
});

test('nested shapes, required strings, product enums and bootstrap membership are validated', () => {
  for (const input of [null, [], true, {}, { brands: [], example: {} }]) {
    assert.throws(() => parseShadeFinderBootstrap(input), /Invalid shade response/);
  }
  for (const types of [[], ['all'], ['cushion', 'cushion'], 'foundation']) {
    assert.throws(() => parseShadeFinderBootstrap({ brands: [{ ...fixtureBrand(), types }], example: null }), /Invalid shade response/);
  }
  const unknownBrand = bootstrap();
  unknownBrand.example.brand.id = uuid(9999);
  assert.throws(() => parseShadeFinderBootstrap(unknownBrand), /Invalid shade response/);
  const inconsistentType = bootstrap();
  inconsistentType.brands[0].types = ['cushion'];
  inconsistentType.example.brand.types = ['cushion'];
  assert.throws(() => parseShadeFinderBootstrap(inconsistentType), /Invalid shade response/);
  for (const patch of [{ id: '' }, { id: 'invalid id' }, { id: 1 }, { name: ' ' }, { nameEn: null }, { type: 'all' }]) {
    assert.throws(() => parseProductsResponse({ products: [{ ...fixtureProduct(), ...patch }] }), /Invalid shade response/);
  }
  assert.throws(() => parseProductsResponse({ products: [fixtureProduct(), fixtureProduct()] }), /Invalid shade response/);
});

test('malformed colors and raw catalog fields are rejected at every response boundary', () => {
  for (const hex of ['e5bda0', '#fff', '#e5bda000', '#ggbda0', '', null, 150]) {
    assert.throws(() => parseShadesResponse({ shades: [{ ...fixtureShade(), hex }] }), /Invalid shade response/);
  }
  for (const [parse, input] of [
    [parseProductsResponse, { products: [{ ...fixtureProduct(), shades: [fixtureShade()] }] }],
    [parseShadesResponse, { shades: [{ ...fixtureShade(), rgb: [229, 189, 160] }] }],
    [parseMatchesResponse, { ...page(), metadata: {} }],
    [parseMatchesResponse, { ...page(), matches: [{ ...fixtureMatch(), source: {} }], nextOffset: null }],
    [parseMatchesResponse, { ...page(), matches: [{ ...fixtureMatch(), product: { ...fixtureProduct(), brandId: uuid(1) } }], nextOffset: null }],
    [parseShadeFinderBootstrap, { ...bootstrap(), catalog: {} }],
  ]) {
    assert.throws(() => parse(input), /Invalid shade response/);
  }
});

test('match scores, unique products, page size and cursor consistency are enforced', () => {
  for (const deltaE of [-1, NaN, Infinity, -Infinity, '0.41', null]) {
    assert.throws(() => parseMatchesResponse({ matches: [{ ...fixtureMatch(), deltaE }], total: 1, nextOffset: null }), /Invalid shade response/);
  }
  for (const total of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '13', null]) {
    assert.throws(() => parseMatchesResponse({ ...page(), total }), /Invalid shade response/);
  }
  for (const nextOffset of [-6, 0, 1, 6.5, 18, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '6']) {
    assert.throws(() => parseMatchesResponse({ ...page(), nextOffset }), /Invalid shade response/);
  }
  for (const input of [
    { ...page(), total: 5 },
    { ...page(), total: 6 },
    { ...page(), matches: Array.from({ length: 7 }, (_, index) => fixtureMatch(index)) },
    { ...page(), matches: Array.from({ length: 6 }, () => fixtureMatch()) },
    { ...page(), matches: [fixtureMatch()] },
  ]) {
    assert.throws(() => parseMatchesResponse(input), /Invalid shade response/);
  }
});

test('queries decode unknown JSON before caching and retry replaces rejected promises', async () => {
  const responses = [
    { products: [{ ...fixtureProduct(), shades: [fixtureShade()] }] },
    { products: [fixtureProduct()] },
    bootstrap(),
  ];
  const urls = [];
  const queries = load('queries.ts', { './public-contracts': contracts, './analytics': { trackShadeRequest() {} } }, {
    AbortSignal,
    URLSearchParams,
    fetch: async url => {
      urls.push(url);
      return { ok: true, json: async () => responses.shift() };
    },
  });
  const url = queries.shadeApiUrl('products', { brandId: uuid(1), type: 'all' });
  const first = queries.requestShadeData('products', url);
  assert.equal(queries.requestShadeData('products', url), first, 'Suspense must receive the same pending promise');
  await assert.rejects(first, /Invalid shade response/);
  assert.equal(queries.requestShadeData('products', url), first, 'Rejected promise remains stable until retry');
  queries.retryShadeData(url);
  const retried = queries.requestShadeData('products', url);
  assert.notEqual(retried, first);
  assert.deepEqual(plain(await retried), { products: [fixtureProduct()] });
  assert.equal(queries.requestShadeData('products', url), retried);
  assert.throws(() => queries.requestShadeData('shades', url), /Invalid shade endpoint/);
  const boot = await queries.requestShadeData('bootstrap', queries.shadeApiUrl('bootstrap', {}));
  assert.deepEqual(plain(boot), bootstrap());
  assert.equal(urls.length, 3);
});

test('HTTP failures reject before attempting to decode a response body', async () => {
  let decoded = false;
  const queries = load('queries.ts', { './public-contracts': contracts, './analytics': { trackShadeRequest() {} } }, {
    AbortSignal,
    URLSearchParams,
    fetch: async () => ({ ok: false, json: async () => { decoded = true; return bootstrap(); } }),
  });
  await assert.rejects(queries.requestShadeData('bootstrap', '/api/craft/shade-finder/bootstrap'), /불러오지 못했어요/);
  assert.equal(decoded, false);
});

const normalizers = load('normalize.ts', { './public-contracts': contracts });
const rawBrand = (patch = {}) => ({ id: uuid(1), name: '브랜드', name_en: 'Brand', product_types: ['foundation', 'cushion'], ...patch });
const rawProduct = (patch = {}) => ({ id: uuid(10), name: '파운데이션', name_en: '', product_type: 'foundation', ...patch });
const rawShade = (patch = {}) => ({ id: uuid(100), name: '21호', hex: '#e5bda0', ...patch });
const rawMatch = (index, patch = {}) => ({
  product_id: uuid(1000 + index), product_name: '파운데이션', product_name_en: '', product_type: 'foundation',
  brand_name: '브랜드', shade_id: uuid(2000 + index), shade_name: '21호', hex: '#e5bda0',
  delta_e: 0.41 + index, total_count: 13, ...patch,
});

test('RPC normalizers translate snake_case once and discard private row fields', () => {
  assert.deepEqual(plain(normalizers.normalizeBrands([rawBrand({ internal_note: 'private' })])), [fixtureBrand()]);
  assert.deepEqual(plain(normalizers.normalizeProducts([rawProduct({ brand_id: uuid(1), sort_order: 1 })])), { products: [fixtureProduct()] });
  assert.deepEqual(plain(normalizers.normalizeShades([rawShade({ lab_l: 70 })])), { shades: [fixtureShade()] });
  const rows = Array.from({ length: 6 }, (_, index) => rawMatch(index));
  const output = normalizers.normalizeMatches(rows, 0);
  assert.deepEqual(plain(output), page());
  assert.equal(normalizers.normalizeMatches(rows, 6).nextOffset, 12);
  assert.equal(normalizers.normalizeMatches([rawMatch(12)], 12).nextOffset, null);
  for (const rawKey of ['product_id', 'product_type', 'name_en', 'delta_e', 'total_count', 'lab_l', 'sort_order']) {
    assert.ok(!JSON.stringify(output).includes(rawKey));
  }
});

test('malformed RPC data fails runtime validation instead of becoming trusted DTOs', () => {
  assert.throws(() => normalizers.normalizeBrands([rawBrand({ product_types: ['all'] })]), /Invalid shade response/);
  assert.throws(() => normalizers.normalizeProducts([rawProduct({ name_en: null })]), /Invalid shade response/);
  assert.throws(() => normalizers.normalizeShades([rawShade({ hex: '#xxx' })]), /Invalid shade response/);
  assert.throws(() => normalizers.normalizeMatches([rawMatch(0, { delta_e: NaN })], 0), /Invalid shade response/);
  assert.throws(() => normalizers.normalizeMatches([rawMatch(0), rawMatch(1, { total_count: 12 })], 0), /Inconsistent shade result count/);
  assert.throws(() => normalizers.normalizeMatches([], -6), /Invalid shade page offset/);
});

function repositoryHarness({ authError = null, result, clients } = {}) {
  const events = [];
  let clientIndex = 0;
  const exports = load('data-access.ts', {
    'server-only': {},
    './normalize': normalizers,
    './public-contracts': contracts,
    '@/lib/supabase/server': {
      serverSupabaseClient: async (...args) => {
        const identity = clients?.[clientIndex++] ?? 'cookie-client';
        events.push(['client', identity, args]);
        return {
          auth: { getUser: async () => { events.push(['auth', identity]); return { data: { user: null }, error: authError }; } },
          rpc: async (name, args) => {
            events.push(['rpc', identity, name, args]);
            return typeof result === 'function' ? result(name, args, identity) : result;
          },
        };
      },
    },
  });
  return { ...exports, events };
}

test('repository verifies each cookie client once and permits only missing-session anonymous access', async () => {
  const harness = repositoryHarness({
    authError: { name: 'AuthSessionMissingError' },
    clients: ['first-request', 'second-request'],
    result: { data: [rawProduct()], error: null },
  });
  const first = await harness.createShadeRepository();
  const second = await harness.createShadeRepository();
  await first.readProducts(uuid(1), 'all');
  await second.readProducts(uuid(1), 'foundation');
  assert.deepEqual(plain(harness.events), [
    ['client', 'first-request', []], ['auth', 'first-request'],
    ['client', 'second-request', []], ['auth', 'second-request'],
    ['rpc', 'first-request', 'shade_finder_products', { p_brand_id: uuid(1) }],
    ['rpc', 'second-request', 'shade_finder_products', { p_brand_id: uuid(1), p_type: 'foundation' }],
  ]);
  const unavailable = repositoryHarness({ authError: { name: 'AuthApiError', message: 'private token' } });
  await assert.rejects(unavailable.createShadeRepository(), error => error.status === 503 && !error.message.includes('token'));
  assert.equal(unavailable.events.filter(event => event[0] === 'rpc').length, 0);
});

test('repository maps database errors safely and rejects null or malformed RPC payloads', async () => {
  for (const [code, status] of [['22023', 400], ['22P02', 400], ['P0002', 404], ['42501', 503], ['PGRST202', 503]]) {
    const harness = repositoryHarness({ result: { data: null, error: { code, message: 'private SQL details', details: 'secret' } } });
    const repository = await harness.createShadeRepository();
    await assert.rejects(repository.readProducts(uuid(1), 'all'), error => error.status === status && !error.message.includes('private') && !error.message.includes('secret'));
  }
  for (const data of [null, {}, [{ id: 'bad' }]]) {
    const harness = repositoryHarness({ result: { data, error: null } });
    const repository = await harness.createShadeRepository();
    await assert.rejects(repository.readShades(uuid(10)), error => error.status === 503);
  }
});

test('repository derives bootstrap examples from database rows and falls back to valid available selections', async () => {
  const harness = repositoryHarness({ result: (name, args) => {
    if (name === 'shade_finder_brands') { return { data: [rawBrand({ name: '헤라' })], error: null }; }
    if (name === 'shade_finder_products') { return { data: [rawProduct(), rawProduct({ id: uuid(11), name: '블랙 쿠션', product_type: 'cushion' })], error: null }; }
    if (name === 'shade_finder_shades' && args.p_product_id === uuid(11)) {
      return { data: [rawShade({ id: uuid(101), name: '13 아이보리' }), rawShade({ id: uuid(102), name: '21N1' })], error: null };
    }
    throw new Error('Unexpected query');
  } });
  const repository = await harness.createShadeRepository();
  const result = await repository.readBootstrap();
  assert.equal(result.example.brand.name, '헤라');
  assert.equal(result.example.product.id, uuid(11));
  assert.equal(result.example.shade.id, uuid(102));
  assert.equal(harness.events.filter(event => event[0] === 'auth').length, 1);

  const fallback = repositoryHarness({ result: name => ({ data: name === 'shade_finder_brands' ? [rawBrand()] : name === 'shade_finder_products' ? [rawProduct()] : [rawShade()], error: null }) });
  assert.deepEqual(plain(await (await fallback.createShadeRepository()).readBootstrap()), bootstrap());
  const empty = repositoryHarness({ result: { data: [], error: null } });
  assert.deepEqual(plain(await (await empty.createShadeRepository()).readBootstrap()), { brands: [], example: null });
});

test('repository preserves count for out-of-range pages without returning extra result data', async () => {
  const harness = repositoryHarness({ result: (_name, args) => ({
    data: args.p_offset === 0 ? Array.from({ length: 6 }, (_, index) => rawMatch(index)) : [],
    error: null,
  }) });
  const repository = await harness.createShadeRepository();
  assert.deepEqual(plain(await repository.readMatches(uuid(100), 'cushion', uuid(1), 18, '브랜드 21')), { matches: [], total: 13, nextOffset: null });
  assert.deepEqual(plain(harness.events.filter(event => event[0] === 'rpc').map(event => event[3])), [
    { p_shade_id: uuid(100), p_offset: 18, p_type: 'cushion', p_brand_id: uuid(1), p_query: '브랜드 21' },
    { p_shade_id: uuid(100), p_offset: 0, p_type: 'cushion', p_brand_id: uuid(1), p_query: '브랜드 21' },
  ]);
});


test('route handlers accept database UUIDs and reject source IDs before opening a repository', async () => {
  const requests = [];
  let clientCount = 0;
  class CatalogReadError extends Error {
    constructor(status) { super('Private SQL details'); this.status = status; }
  }
  const server = load('server.ts', {
    'server-only': {},
    './public-contracts': contracts,
    './data-access': {
      CatalogReadError,
      createShadeRepository: async () => {
        clientCount += 1;
        return {
          readProducts: async (...args) => {
            requests.push(args);
            if (args[0] === uuid(9999)) { throw new CatalogReadError(404); }
            return { products: [fixtureProduct()] };
          },
          readShades: async (...args) => { requests.push(args); return { shades: [fixtureShade()] }; },
          readMatches: async (...args) => { requests.push(args); return page(); },
        };
      },
    },
  }, { URL, URLSearchParams, Response });
  const request = params => new Request(`http://localhost/api/craft/shade-finder?${new URLSearchParams(params)}`);
  for (const [handler, params] of [
    [server.handleProductsRequest, { brandId: uuid(1), type: 'cushion' }],
    [server.handleShadesRequest, { productId: uuid(10) }],
    [server.handleMatchesRequest, { shadeId: uuid(100), brandId: uuid(1), offset: '6' }],
  ]) {
    assert.equal((await handler(request(params))).status, 200);
  }
  assert.deepEqual(plain(requests), [[uuid(1), 'cushion'], [uuid(10)], [uuid(100), 'all', uuid(1), 6, '']]);
  for (const [handler, params] of [
    [server.handleProductsRequest, { brandId: 'B1' }],
    [server.handleShadesRequest, { productId: 'B1:P1' }],
    [server.handleMatchesRequest, { shadeId: 'B1:P1:S1' }],
    [server.handleMatchesRequest, { shadeId: uuid(100), brandId: 'B1' }],
    [server.handleMatchesRequest, { shadeId: '00000000-0000-4000-8000-00000000000A' }],
  ]) {
    assert.equal((await handler(request(params))).status, 400);
  }
  assert.equal(clientCount, 3, 'Invalid IDs must not reach Supabase');
  const missing = await server.handleProductsRequest(request({ brandId: uuid(9999) }));
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: 'Unable to load shade data.' });
});


test('match search validates raw Unicode length and controls before normalizing and forwarding terms', async () => {
  const requests = [];
  const server = load('server.ts', {
    'server-only': {},
    './public-contracts': contracts,
    './data-access': {
      CatalogReadError: class extends Error {},
      createShadeRepository: async () => ({
        readMatches: async (...args) => { requests.push(args); return page(); },
      }),
    },
  }, { URL, URLSearchParams, Response });
  const request = query => new Request(`http://localhost/api/craft/shade-finder/matches?${new URLSearchParams({ shadeId: uuid(100), q: query })}`);
  for (const [query, expected] of [
    ['  브랜드   21  ', '브랜드 21'],
    ['  ', ''],
    ['Shade 100%_\\', 'Shade 100%_\\'],
    ['😀'.repeat(100), '😀'.repeat(100)],
    ['가'.repeat(100), '가'.repeat(100)],
  ]) {
    assert.equal((await server.handleMatchesRequest(request(query))).status, 200);
    assert.deepEqual(plain(requests.at(-1)), [uuid(100), 'all', null, 0, expected]);
  }
  for (const query of ['가'.repeat(101), '😀'.repeat(101), ' '.repeat(101), 'a\t b', 'a\n b', '\u0000', '\u001f', '\u007f']) {
    assert.equal((await server.handleMatchesRequest(request(query))).status, 400);
  }
  const duplicate = new Request(`http://localhost/api/craft/shade-finder/matches?shadeId=${uuid(100)}&q=first&q=second`);
  assert.equal((await server.handleMatchesRequest(duplicate)).status, 400);
  assert.equal(requests.length, 5, 'Invalid search queries must not reach Supabase');
});
