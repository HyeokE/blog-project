import assert from 'node:assert/strict';
import test from 'node:test';
import { compareShadeColors } from '../src/features/shade-finder/color-comparison.mjs';

test('identical HEX values are equal regardless of letter case', () => {
  const rows = compareShadeColors('#E5BDA0', '#e5bda0');
  assert.deepEqual(rows.map((row) => row.key), ['lightness', 'chroma', 'redness', 'yellowness']);
  assert.deepEqual(rows.map((row) => row.label), ['색 밝기', '채도', '붉은기', '노란기']);
  for (const row of rows) {
    assert.equal(row.direction, 0);
    assert.equal(row.description, '같아요');
  }
});

test('black to white changes lightness while chromatic axes remain neutral', () => {
  const [lightness, ...chromatic] = compareShadeColors('#000000', '#ffffff');
  assert.equal(lightness.direction, 1);
  assert.equal(lightness.description, '더 밝아요');
  assert.ok(chromatic.every((row) => row.direction === 0));
  assert.equal(compareShadeColors('#ffffff', '#000000')[0].description, '더 어두워요');
});

test('swapping source and target reverses every non-neutral direction', () => {
  for (const pair of [['#e5bda0', '#c89a76'], ['#808080', '#ff0000'], ['#123456', '#fedcba']]) {
    const forward = compareShadeColors(...pair);
    const reverse = compareShadeColors(...pair.toReversed());
    forward.forEach((row, index) => {
      assert.equal(reverse[index].direction, row.direction === 0 ? 0 : -row.direction);
    });
  }
});

test('nearby swatches stay in the presentation deadband without claiming identical HEX', () => {
  for (const row of compareShadeColors('#e5bda0', '#e6bea1')) {
    assert.equal(row.direction, 0);
    assert.equal(row.description, '거의 같아요');
  }
});

test('redness and yellowness can vary independently for foundation-like swatches', () => {
  const redder = compareShadeColors('#e5bda0', '#e9bba0');
  assert.equal(redder[2].direction, 1);
  assert.equal(redder[2].description, '붉은기가 많아요');
  assert.equal(redder[3].direction, 0);

  const yellower = compareShadeColors('#e5bda0', '#e7bd97');
  assert.equal(yellower[2].direction, 0);
  assert.equal(yellower[3].direction, 1);
  assert.equal(yellower[3].description, '노란기가 많아요');

  assert.equal(compareShadeColors('#e9bba0', '#e5bda0')[2].description, '붉은기가 적어요');
  assert.equal(compareShadeColors('#e7bd97', '#e5bda0')[3].description, '노란기가 적어요');
});

test('chroma describes vivid and muted swatches independently of brightness', () => {
  assert.equal(compareShadeColors('#808080', '#ff0000')[1].description, '더 선명해요');
  assert.equal(compareShadeColors('#ff0000', '#808080')[1].description, '더 차분해요');
});

test('invalid HEX is rejected on both sides', () => {
  for (const invalid of ['e5bda0', '#fff', '#gggggg', '#e5bda0ff', '', null, 123]) {
    assert.throws(() => compareShadeColors(invalid, '#e5bda0'), RangeError);
    assert.throws(() => compareShadeColors('#e5bda0', invalid), RangeError);
  }
});

test('inputs and later results are unaffected by callers changing returned rows', () => {
  const input = Object.freeze(['#e5bda0', '#e9bba0']);
  const result = compareShadeColors(...input);
  result[0].label = 'changed';
  result.pop();
  assert.deepEqual(input, ['#e5bda0', '#e9bba0']);
  const fresh = compareShadeColors(...input);
  assert.equal(fresh.length, 4);
  assert.equal(fresh[0].label, '색 밝기');
});
