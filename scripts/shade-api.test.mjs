import assert from 'node:assert/strict';
import test from 'node:test';

// Run against a local app backed by configured Supabase. No snapshots are read.
const origin = process.env.SHADE_FINDER_TEST_URL;
if (origin && !['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname)) {
  throw new Error('SHADE_FINDER_TEST_URL must point to a local test server');
}
const live = { skip: !origin };
const brandKeys = ['id', 'name', 'nameEn', 'types'];
const productKeys = ['id', 'name', 'nameEn', 'type'];
const shadeKeys = ['hex', 'id', 'name'];
const privateKeys = new Set([
  'catalog', 'metadata', 'rgb', 'sourceUrl', 'sourceSha256', 'capturedAt',
  'source_sha256', 'import_sha256', 'source_id', 'source_key', 'sourceId', 'sourceKey', 'rawBrands', 'rawProducts', 'rawShades',
  'lab_l', 'lab_a', 'lab_b', 'product_type', 'name_en', 'total_count', 'delta_e',
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const keys = (value, expected) => assert.deepEqual(Object.keys(value).sort(), [...expected].sort());
const compareId = (first, second) => first < second ? -1 : first > second ? 1 : 0;
const compareMatches = (first, second) => first.deltaE - second.deltaE || compareId(first.product.id, second.product.id) || compareId(first.shade.id, second.shade.id);

function noPrivateFields(value) {
  if (!value || typeof value !== 'object') { return; }
  for (const [key, child] of Object.entries(value)) {
    assert.ok(!privateKeys.has(key), `Private/raw field leaked: ${key}`);
    noPrivateFields(child);
  }
}

async function get(route, params, expectedStatus = 200) {
  const response = await fetch(`${origin}/api/craft/shade-finder/${route}?${new URLSearchParams(params)}`);
  assert.equal(response.status, expectedStatus, `${route}: ${JSON.stringify(params)}`);
  assert.ok(response.headers.get('cache-control')?.split(',').map(value => value.trim()).includes('no-store'));
  const data = await response.json();
  noPrivateFields(data);
  if (expectedStatus !== 200) {
    keys(data, ['error']);
    assert.equal(typeof data.error, 'string');
  }
  return data;
}

let bootstrapPromise;
function bootstrap() {
  bootstrapPromise ??= get('bootstrap', {});
  return bootstrapPromise;
}

async function selection() {
  const result = await bootstrap();
  assert.ok(result.example, 'Configured catalog must have an example selection for this integration suite');
  return result.example;
}

function validateProduct(product) {
  keys(product, productKeys);
  assert.match(product.id, uuidPattern);
  assert.equal(typeof product.name, 'string');
  assert.equal(typeof product.nameEn, 'string');
  assert.ok(product.type === 'foundation' || product.type === 'cushion');
}

function validateShade(shade) {
  keys(shade, shadeKeys);
  assert.match(shade.id, uuidPattern);
  assert.equal(typeof shade.name, 'string');
  assert.match(shade.hex, /^#[0-9a-f]{6}$/);
}

function validateMatchPage(result, sourceProductId, offset) {
  keys(result, ['matches', 'total', 'nextOffset']);
  assert.ok(Number.isSafeInteger(result.total) && result.total >= 0);
  assert.equal(result.matches.length, Math.min(6, Math.max(0, result.total - offset)));
  assert.equal(result.nextOffset, offset + 6 < result.total ? offset + 6 : null);
  assert.equal(new Set(result.matches.map(match => match.product.id)).size, result.matches.length);
  result.matches.forEach((match, index) => {
    keys(match, ['product', 'brandName', 'shade', 'deltaE']);
    validateProduct(match.product);
    validateShade(match.shade);
    assert.notEqual(match.product.id, sourceProductId);
    assert.equal(typeof match.brandName, 'string');
    assert.ok(Number.isFinite(match.deltaE) && match.deltaE >= 0);
    if (index > 0) { assert.ok(compareMatches(result.matches[index - 1], match) <= 0); }
  });
}

test('bootstrap exposes only brand options and one selection confirmed by the list APIs', live, async () => {
  const result = await bootstrap();
  keys(result, ['brands', 'example']);
  assert.ok(result.brands.length > 0);
  assert.equal(new Set(result.brands.map(brand => brand.id)).size, result.brands.length);
  for (const brand of result.brands) {
    keys(brand, brandKeys);
    assert.match(brand.id, uuidPattern);
    assert.equal(typeof brand.name, 'string');
    assert.equal(typeof brand.nameEn, 'string');
    assert.ok(brand.types.length > 0);
    assert.equal(new Set(brand.types).size, brand.types.length);
    assert.ok(brand.types.every(type => type === 'foundation' || type === 'cushion'));
  }
  const example = await selection();
  keys(example, ['brand', 'product', 'shade']);
  keys(example.brand, brandKeys);
  validateProduct(example.product);
  validateShade(example.shade);
  assert.deepEqual(example.brand, result.brands.find(brand => brand.id === example.brand.id));
  const { products } = await get('products', { brandId: example.brand.id, type: 'all' });
  const { shades } = await get('shades', { productId: example.product.id });
  assert.deepEqual(example.product, products.find(product => product.id === example.product.id));
  assert.deepEqual(example.shade, shades.find(shade => shade.id === example.shade.id));
});

test('product and shade endpoints expose selected lists, consistent filters and exact display fields', live, async () => {
  const source = await selection();
  const products = await get('products', { brandId: source.brand.id, type: 'all' });
  keys(products, ['products']);
  assert.ok(products.products.length > 0);
  assert.equal(new Set(products.products.map(product => product.id)).size, products.products.length);
  products.products.forEach(validateProduct);
  for (const type of ['foundation', 'cushion']) {
    const filtered = await get('products', { brandId: source.brand.id, type });
    assert.deepEqual(filtered.products, products.products.filter(product => product.type === type));
  }
  assert.deepEqual([...new Set(products.products.map(product => product.type))].sort(), [...source.brand.types].sort());
  const shades = await get('shades', { productId: source.product.id });
  keys(shades, ['shades']);
  assert.ok(shades.shades.length > 0);
  assert.equal(new Set(shades.shades.map(shade => shade.id)).size, shades.shades.length);
  shades.shades.forEach(validateShade);
});

test('matches use six-result pages with stable ranking, source exclusion and accurate final-page counts', live, async () => {
  const source = await selection();
  const params = { shadeId: source.shade.id, type: 'all', offset: '0' };
  const first = await get('matches', params);
  validateMatchPage(first, source.product.id, 0);
  assert.ok(first.total > 0, 'Configured catalog must contain another product');
  assert.deepEqual(await get('matches', params), first, 'Identical requests must preserve stable ranking');
  if (first.nextOffset !== null) {
    const second = await get('matches', { ...params, offset: String(first.nextOffset) });
    validateMatchPage(second, source.product.id, first.nextOffset);
    assert.equal(second.total, first.total);
    assert.ok(compareMatches(first.matches.at(-1), second.matches[0]) <= 0);
    assert.equal(new Set([...first.matches, ...second.matches].map(match => match.product.id)).size, first.matches.length + second.matches.length);
  }
  const lastOffset = Math.floor((first.total - 1) / 6) * 6;
  const last = await get('matches', { ...params, offset: String(lastOffset) });
  validateMatchPage(last, source.product.id, lastOffset);
  assert.equal(last.total, first.total);
  assert.equal(last.nextOffset, null);
  const beyond = await get('matches', { ...params, offset: String(lastOffset + 6) });
  assert.deepEqual(beyond, { matches: [], total: first.total, nextOffset: null });

  const filter = { shadeId: source.shade.id, type: source.product.type, brandId: source.brand.id };
  const { products } = await get('products', { brandId: source.brand.id, type: source.product.type });
  const candidates = products.filter(product => product.id !== source.product.id);
  const filtered = await get('matches', filter);
  validateMatchPage(filtered, source.product.id, 0);
  assert.equal(filtered.total, candidates.length);
  for (const match of filtered.matches) {
    assert.ok(candidates.some(product => product.id === match.product.id));
    assert.equal(match.product.type, source.product.type);
    assert.equal(match.brandName, source.brand.name);
  }
});

test('HEX matching returns the same public shape and includes the exact reference product', live, async () => {
  const source = await selection();
  const params = { hex: source.shade.hex.toUpperCase(), type: source.product.type, brandId: source.brand.id };
  const first = await get('matches', params);
  validateMatchPage(first, undefined, 0);
  const { products } = await get('products', { brandId: source.brand.id, type: source.product.type });
  assert.equal(first.total, products.length);
  const exact = await get('matches', { ...params, q: source.product.name });
  assert.ok(exact.matches.some(match => match.product.id === source.product.id && match.deltaE < 1e-10));
  assert.deepEqual(await get('matches', { ...params, hex: source.shade.hex }), first);
  const lastOffset = Math.floor((first.total - 1) / 6) * 6;
  assert.deepEqual(await get('matches', { ...params, offset: String(lastOffset + 6) }), { matches: [], total: first.total, nextOffset: null });
  for (const invalid of [
    { hex: '#e5bda0', shadeId: source.shade.id }, { hex: '#fff' }, { hex: '' },
    [['hex', '#e5bda0'], ['hex', '#ffffff']], { hex: '#e5bda0', offset: '1' },
  ]) { await get('matches', invalid, 400); }
});

test('API rejects missing, malformed, duplicate, unknown and unbounded queries', live, async () => {
  const source = await selection();
  const shadeId = source.shade.id;
  const unknownId = crypto.randomUUID();
  const invalid = [
    ['bootstrap', { include: 'catalog' }, 400],
    ['bootstrap', { limit: 'all' }, 400],
    ['bootstrap', [['include', 'metadata'], ['include', 'products']], 400],
    ['products', {}, 400],
    ['products', { brandId: '' }, 400],
    ['products', { brandId: 'B1' }, 400],
    ['products', { brandId: unknownId }, 404],
    ['products', { brandId: source.brand.id, type: 'concealer' }, 400],
    ['products', { brandId: source.brand.id, type: '' }, 400],
    ['products', { brandId: source.brand.id, limit: 'all' }, 400],
    ['shades', {}, 400],
    ['shades', { productId: 'B1:P1' }, 400],
    ['shades', { productId: unknownId }, 404],
    ['shades', { productId: source.product.id, include: 'metadata' }, 400],
    ['matches', {}, 400],
    ['matches', { shadeId: 'B1:P1:S1' }, 400],
    ['matches', { shadeId, brandId: 'B1' }, 400],
    ['matches', { shadeId: '00000000-0000-4000-8000-00000000000A' }, 400],
    ['matches', { shadeId: unknownId }, 404],
    ['matches', { shadeId: 'x'.repeat(161) }, 400],
    ['matches', { shadeId, brandId: '' }, 400],
    ['matches', { shadeId, brandId: unknownId }, 404],
    ['matches', { shadeId, limit: '999999' }, 400],
    ['matches', { shadeId, offset: '-6' }, 400],
    ['matches', { shadeId, offset: '1' }, 400],
    ['matches', { shadeId, offset: '6.0' }, 400],
    ['matches', { shadeId, offset: '06' }, 400],
    ['matches', { shadeId, offset: '6e1' }, 400],
    ['matches', { shadeId, offset: '999999999999999999999999' }, 400],
    ['matches', [['shadeId', shadeId], ['shadeId', shadeId]], 400],
    ['matches', [['shadeId', shadeId], ['q', 'first'], ['q', 'second']], 400],
    ...['가'.repeat(101), '😀'.repeat(101), ' '.repeat(101), 'a\t b', 'a\n b', '\u0000', '\u001f', '\u007f'].map(q => ['matches', { shadeId, q }, 400]),
  ];
  for (const [route, params, status] of invalid) {
    await get(route, params, status);
  }
});

test('initial HTML renders the shell without serializing catalog records or raw fields', live, async () => {
  const response = await fetch(`${origin}/craft/shade-finder`);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('SHADE FINDER'));
  assert.ok(!html.includes('fetch() URL is invalid') && !html.includes('Failed to parse URL'), 'Server render attempted a relative client-only fetch');
  assert.doesNotMatch(html, /\\*"(?:sourceSha256|source_sha256|import_sha256|rawBrands|rawProducts|rawShades|lab_l|lab_a|lab_b|rgb)\\*"\s*:/, 'Raw catalog fields leaked into HTML');
  assert.doesNotMatch(html, /\\*"(?:brands|products|shades)\\*"\s*:\s*\[/, 'Catalog lists were serialized into the client-only shell');
});


test('search finds matches beyond the first page using Korean, English and multiple terms without changing nearest shades', live, async () => {
  const source = await selection();
  const { brands } = await bootstrap();
  const params = { shadeId: source.shade.id };
  const initial = await get('matches', params);
  const lastOffset = Math.floor((initial.total - 1) / 6) * 6;
  const last = await get('matches', { ...params, offset: String(lastOffset) });
  const target = last.matches.find(match => !initial.matches.some(first => first.product.id === match.product.id));
  assert.ok(target, 'Configured catalog needs enough products to test searching outside the loaded page');
  const targetBrand = brands.find(brand => brand.name === target.brandName);
  assert.ok(targetBrand);

  const fields = match => [
    match.brandName,
    brands.find(brand => brand.name === match.brandName)?.nameEn ?? '',
    match.product.name,
    match.product.nameEn,
    match.shade.name,
  ].join(' ').toLowerCase();
  const search = async (q, filters = {}) => {
    const result = await get('matches', { ...params, ...filters, q });
    validateMatchPage(result, source.product.id, 0);
    const terms = q.trim().toLowerCase().split(/\s+/u);
    for (const match of result.matches) {
      assert.ok(terms.every(term => fields(match).includes(term)), `Search terms must all match: ${q}`);
    }
    return result;
  };

  const exactQuery = `${target.brandName} ${target.product.name}`;
  const exact = await search(exactQuery);
  let found = exact.matches.find(match => match.product.id === target.product.id);
  let nextOffset = exact.nextOffset;
  while (!found && nextOffset !== null) {
    const result = await get('matches', { ...params, q: exactQuery, offset: String(nextOffset) });
    validateMatchPage(result, source.product.id, nextOffset);
    found = result.matches.find(match => match.product.id === target.product.id);
    nextOffset = result.nextOffset;
  }
  assert.deepEqual(found, target, 'Searching must retain the same nearest shade and distance for each product');
  assert.deepEqual(await search(`  ${exactQuery.replaceAll(' ', '   ')}  `), exact);
  for (const q of [target.brandName, target.shade.name]) {
    assert.ok((await search(q)).total > 0);
  }
  const english = [target.product.nameEn, targetBrand.nameEn].find(value => /[a-z]/i.test(value));
  assert.ok(english, 'Configured catalog must include an English searchable name');
  assert.deepEqual(await search(english.toUpperCase()), await search(english.toLowerCase()));
  const combined = await search(`${target.brandName} ${target.shade.name}`);
  assert.ok(combined.total > 0);
  const filtered = await search(exactQuery, { brandId: targetBrand.id, type: target.product.type });
  assert.ok(filtered.total > 0);
  assert.ok(filtered.matches.every(match => match.brandName === target.brandName && match.product.type === target.product.type));
  const oppositeType = target.product.type === 'foundation' ? 'cushion' : 'foundation';
  const intersection = await search(exactQuery, { brandId: targetBrand.id, type: oppositeType });
  assert.ok(intersection.matches.every(match => match.product.type === oppositeType));
  assert.ok(!intersection.matches.some(match => match.product.id === target.product.id));

  for (const q of ['no-such-shade-' + crypto.randomUUID(), '%_\\', '😀'.repeat(100)]) {
    assert.deepEqual(await get('matches', { ...params, q }), { matches: [], total: 0, nextOffset: null });
  }
  assert.deepEqual(await get('matches', { ...params, q: '' }), initial);
  assert.deepEqual(await get('matches', { ...params, q: '   ' }), initial);
});

test('search pagination preserves ranking, counts and filters through the final and empty pages', live, async () => {
  const source = await selection();
  const initial = await get('matches', { shadeId: source.shade.id });
  const word = initial.matches.find(match => match.product.type === 'cushion') ? '쿠션' : '파운데이션';
  const params = { shadeId: source.shade.id, q: word };
  const first = await get('matches', params);
  validateMatchPage(first, source.product.id, 0);
  assert.ok(first.nextOffset !== null, 'Configured catalog must have more than six results for a product category term');
  const second = await get('matches', { ...params, offset: String(first.nextOffset) });
  validateMatchPage(second, source.product.id, first.nextOffset);
  assert.equal(second.total, first.total);
  assert.ok(compareMatches(first.matches.at(-1), second.matches[0]) <= 0);
  assert.equal(new Set([...first.matches, ...second.matches].map(match => match.product.id)).size, 12);
  const lastOffset = Math.floor((first.total - 1) / 6) * 6;
  const last = await get('matches', { ...params, offset: String(lastOffset) });
  validateMatchPage(last, source.product.id, lastOffset);
  assert.equal(last.total, first.total);
  assert.deepEqual(await get('matches', { ...params, offset: String(lastOffset + 6) }), { matches: [], total: first.total, nextOffset: null });
});
