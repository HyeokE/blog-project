import assert from 'node:assert/strict';
import test from 'node:test';
import { createSyntheticCatalog, referencePairs } from './test-support/shade-fixture.mjs';
import { classifyProduct, normalizeCatalog } from './import-shade-catalog.mjs';
import { deltaE2000, findSimilarShades, hexToRgb, rgbToLab } from '../src/features/shade-finder/matching.mjs';
import { describeDifference } from '../src/features/shade-finder/difference-scale.mjs';

test('difference steps explain small distances and agree with displayed values at boundaries', () => {
  assert.equal(describeDifference(0.41).level, 1);
  assert.equal(describeDifference(0).level, 1);
  for (const [input, level] of [[0.999, 2], [1.999, 3], [2.999, 4], [4.999, 5], [8, 5]]) {
    const result = describeDifference(input);
    assert.equal(result.level, level);
    assert.ok(Number(result.value) < result.upperBound);
  }
  assert.throws(() => describeDifference(-1), RangeError);
  assert.throws(() => describeDifference(NaN), RangeError);
});

const catalog = createSyntheticCatalog();
const near = (actual, expected, tolerance = 0.00005) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`,
  );



test('CIEDE2000 matches all published reference pairs in both directions', () => {
  for (const row of referencePairs) {
    near(deltaE2000(row.slice(0, 3), row.slice(3, 6)), row[6]);
    near(deltaE2000(row.slice(3, 6), row.slice(0, 3)), row[6]);
  }
  assert.equal(deltaE2000([50, 10, -20], [50, 10, -20]), 0);
});

test('sRGB conversion uses D50 Lab, with neutral endpoints and red primary', () => {
  rgbToLab([0, 0, 0]).forEach((value) => near(value, 0));
  rgbToLab([255, 255, 255]).forEach((value, index) => near(value, index === 0 ? 100 : 0));
  const red = [54.2905, 80.8049, 69.891];
  rgbToLab([255, 0, 0]).forEach((value, index) => near(value, red[index], 0.0001));
  assert.throws(() => rgbToLab([256, 0, 0]), RangeError);
  assert.throws(() => rgbToLab([0, NaN, 0]), RangeError);
});

test('synthetic catalog identities, membership and RGB/hex are consistent', () => {
  const counts = catalog.metadata.counts;
  assert.equal(counts.rawShades, 112);
  assert.equal(counts.duplicateShadesRemoved, 0);
  assert.equal(counts.rawShades - counts.duplicateShadesRemoved, counts.uniqueShades);
  assert.equal(catalog.products.length, counts.includedProducts);
  assert.equal(catalog.brands.length, counts.includedBrands);
  assert.equal(counts.rawProducts - counts.excludedProducts, counts.includedProducts);
  assert.match(catalog.metadata.sourceSha256, /^[a-f\d]{64}$/);
  assert.equal(catalog.metadata.capturedAt, '2000-01-01T00:00:00.000Z');
  const brands = new Set(catalog.brands.map((brand) => brand.id));
  const productIds = new Set();
  const shadeIds = new Set();
  for (const product of catalog.products) {
    assert.ok(brands.has(product.brandId));
    assert.ok(!productIds.has(product.id));
    productIds.add(product.id);
    assert.ok(product.shades.length > 0);
    assert.equal(product.type, classifyProduct(`${product.name} ${product.nameEn}`));
    for (const shade of product.shades) {
      assert.ok(!shadeIds.has(shade.id));
      shadeIds.add(shade.id);
      assert.ok(shade.id.startsWith(`${product.id}:`));
      assert.equal(shade.rgb.length, 3);
      assert.ok(
        shade.rgb.every((channel) => Number.isInteger(channel) && channel >= 0 && channel <= 255),
      );
      assert.equal(
        shade.hex,
        `#${shade.rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`,
      );
      assert.ok(shade.name);
    }
  }
  assert.equal(shadeIds.size, counts.includedShades);
  assert.equal(counts.foundationProducts + counts.cushionProducts, productIds.size);
  // Identical invented shade suffixes are scoped to each generated product.
  assert.equal(new Set([...shadeIds].map(id => id.split(':').at(-1))).size, 4);
});

test('ambiguous BB, concealer, tint and pact names are not called foundation', () => {
  for (const name of [
    'BB Cream',
    '비비크림',
    'Concealer',
    '틴티드 크림',
    '커버 팩트',
    '스킨 틴트',
    'Cushioning Skin Tint',
  ]) {
    assert.equal(classifyProduct(name), null);
  }
  assert.equal(classifyProduct('Foundation To Go (Cushion)'), 'cushion');
  assert.equal(classifyProduct('파운데이션 투고(쿠션)'), 'cushion');
  assert.equal(classifyProduct('Glow Foundation'), 'foundation');
});

const sampleShade = (id, rgb) => ({
  id, name: id, rgb,
  hex: `#${rgb.map(channel => channel.toString(16).padStart(2, '0')).join('')}`,
});
const sampleProduct = (id, brandId, type, shades) => ({
  id,
  brandId,
  name: id,
  nameEn: id,
  type,
  shades,
});
const sampleCatalog = {
  products: [
    sampleProduct('source', 'b1', 'foundation', [
      sampleShade('source:one', [220, 180, 150]),
      sampleShade('source:two', [220, 180, 150]),
    ]),
    sampleProduct('z', 'b2', 'cushion', [sampleShade('z:near', [220, 180, 150])]),
    sampleProduct('a', 'b2', 'foundation', [
      sampleShade('a:far', [10, 10, 10]),
      sampleShade('a:z', [220, 180, 150]),
      sampleShade('a:a', [220, 180, 150]),
    ]),
    sampleProduct('d', 'b1', 'cushion', [sampleShade('d:one', [200, 160, 130])]),
  ],
};

test('hex is validated and drives matching even when legacy RGB fields disagree', () => {
  assert.deepEqual(hexToRgb('#3080a0'), [48, 128, 160]);
  assert.deepEqual(hexToRgb('#3080A0'), [48, 128, 160]);
  for (const invalid of ['', '#fff', '3080a0', '#3080a000', '#gg0000', null]) {
    assert.throws(() => hexToRgb(invalid), RangeError);
  }
  const contradictory = {
    products: [
      sampleProduct('source', 'b1', 'cushion', [
        { id: 'source:one', name: 'Source', hex: '#3080a0', rgb: [0, 0, 0] },
      ]),
      sampleProduct('other', 'b2', 'foundation', [
        { id: 'other:hex', name: 'Same hex', hex: '#3080a0', rgb: [255, 255, 255] },
        { id: 'other:rgb', name: 'Same RGB', hex: '#000000', rgb: [0, 0, 0] },
      ]),
    ],
  };
  const [match] = findSimilarShades(contradictory, 'source:one');
  assert.equal(match.shade.id, 'other:hex');
  assert.equal(match.deltaE, 0);
  contradictory.products[0].shades[0].hex = '#invalid';
  assert.throws(() => findSimilarShades(contradictory, 'source:one'), RangeError);
});

test('matches select one nearest shade per other product and resolve ties by stable IDs', () => {
  const before = structuredClone(sampleCatalog);
  const results = findSimilarShades(sampleCatalog, 'source:one', { limit: Infinity });
  assert.deepEqual(
    results.map((match) => match.product.id),
    ['a', 'z', 'd'],
  );
  assert.equal(results[0].shade.id, 'a:a');
  assert.equal(results[0].deltaE, 0);
  assert.ok(results[2].deltaE > 0);
  const shuffled = {
    products: [...sampleCatalog.products]
      .reverse()
      .map((product) => ({ ...product, shades: [...product.shades].reverse() })),
  };
  const ranking = (matches) =>
    matches.map(({ product, shade, deltaE }) => [product.id, shade.id, deltaE]);
  assert.deepEqual(
    ranking(findSimilarShades(shuffled, 'source:one', { limit: Infinity })),
    ranking(results),
  );
  assert.deepEqual(sampleCatalog, before);
});

test('target type, target brand, limits and unknown source selections behave predictably', () => {
  assert.deepEqual(
    findSimilarShades(sampleCatalog, 'source:one', { type: 'cushion', brandId: 'b2' }).map(
      (match) => match.product.id,
    ),
    ['z'],
  );
  assert.equal(findSimilarShades(sampleCatalog, 'source:one', { limit: 1 }).length, 1);
  assert.deepEqual(findSimilarShades(sampleCatalog, 'source:one', { limit: 0 }), []);
  assert.deepEqual(findSimilarShades(sampleCatalog, 'source:one', { brandId: 'missing' }), []);
  assert.deepEqual(findSimilarShades(sampleCatalog, 'missing'), []);
  assert.throws(() => findSimilarShades(sampleCatalog, 'source:one', { limit: -1 }), RangeError);
});

test('generated catalog rankings are finite, monotonic and exclude the selected product', () => {
  const source = catalog.products[0];
  const matches = findSimilarShades(catalog, source.shades[0].id, { limit: Infinity });
  assert.equal(matches.length, catalog.products.length - 1);
  matches.forEach((match, index) => {
    assert.notEqual(match.product.id, source.id);
    assert.ok(Number.isFinite(match.deltaE));
    assert.ok(match.deltaE >= 0);
    if (index > 0) assert.ok(match.deltaE >= matches[index - 1].deltaE);
  });
  assert.equal(new Set(matches.map((match) => match.product.id)).size, matches.length);
});

function sourceFixture() {
  const response = (rows) => ({ resultCode: '200', totalcnt: rows.length, rows });
  const item = (productCode, name) => ({
    BRANDCD: 'B',
    PRODUCTCD: productCode,
    ITEMCD: 'REUSED',
    ITEMCOLORNO_KO: name,
    ITEMORD: '10',
    RGB_R: '220',
    RGB_G: '180',
    RGB_B: '150',
  });
  return {
    metadata: {
      finishedAt: '2000-01-01T00:00:00.000Z',
      source: 'https://example.test',
      app: 'https://example.test',
    },
    brandResponse: response([{ BRANDCD: 'B', BRANDNM_KO: '가상 브랜드' }]),
    productResponses: [
      {
        BRANDCD: 'B',
        response: response([
          { BRANDCD: 'B', PRODUCTCD: 'P1', PRODUCTNM_KO: '파운데이션', PRODUCTNM_EN: 'Foundation' },
          { BRANDCD: 'B', PRODUCTCD: 'P2', PRODUCTNM_KO: '쿠션', PRODUCTNM_EN: 'Cushion' },
        ]),
      },
    ],
    itemResponses: [
      {
        BRANDCD: 'B',
        PRODUCTCD: 'P1',
        response: response([item('P1', 'Synthetic Tone'), item('P1', '가상 색상')]),
      },
      { BRANDCD: 'B', PRODUCTCD: 'P2', response: response([item('P2', 'Synthetic Tone')]) },
    ],
  };
}

test('import deduplicates within product, preserves cross-product IDs and chooses Korean labels', () => {
  const raw = sourceFixture();
  const imported = normalizeCatalog(raw, 'test');
  assert.ok(!Object.hasOwn(imported.metadata, 'sourceUrl'));
  assert.ok(!Object.hasOwn(imported.metadata, 'sourceAppUrl'));
  assert.ok(!JSON.stringify(imported).includes('example.test'));
  assert.equal(imported.metadata.counts.duplicateShadesRemoved, 1);
  assert.equal(imported.metadata.counts.includedShades, 2);
  assert.equal(imported.products[0].shades[0].id, 'B:P1:REUSED');
  assert.equal(imported.products[0].shades[0].name, '가상 색상');
  raw.itemResponses[0].response.rows.reverse();
  assert.deepEqual(normalizeCatalog(raw, 'test'), imported);
});

test('import rejects conflicting duplicates, invalid RGB, missing responses and incomplete captures', () => {
  const conflict = sourceFixture();
  conflict.itemResponses[0].response.rows[1].RGB_R = '221';
  assert.throws(() => normalizeCatalog(conflict, 'test'), /Conflicting duplicate/);
  const invalid = sourceFixture();
  invalid.itemResponses[0].response.rows[0].RGB_R = '';
  assert.throws(() => normalizeCatalog(invalid, 'test'), /Missing RGB/);
  const missing = sourceFixture();
  missing.itemResponses.pop();
  assert.throws(() => normalizeCatalog(missing, 'test'), /Missing product responses/);
  const incomplete = sourceFixture();
  incomplete.itemResponses[0].response.totalcnt = 3;
  assert.throws(() => normalizeCatalog(incomplete, 'test'), /row count mismatch/);
});
