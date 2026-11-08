import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleSkinPatch, createWhiteBalance, applyWhiteBalance, averageSkinColors } from '../src/features/shade-finder/skin-sampling.mjs';

test('averages three samples in linear light instead of averaging encoded HEX channels', () => {
  const colors = [[0, 0, 0], [255, 255, 255], [0, 0, 0]];
  assert.deepEqual(averageSkinColors(colors), { hex: '#9c9c9c', rgb: [156, 156, 156] });
  assert.deepEqual(averageSkinColors(colors.toReversed()), averageSkinColors(colors));
  assert.deepEqual(colors[1], [255, 255, 255]);
});

test('identical samples preserve colour including sRGB transfer boundaries', () => {
  for (const rgb of [[0, 0, 0], [1, 10, 11], [205, 155, 115], [255, 255, 255]]) {
    assert.deepEqual(averageSkinColors([rgb, rgb, rgb]).rgb, rgb);
  }
});

test('requires all three complete RGB samples before producing an average', () => {
  const rgb = [200, 150, 100];
  for (const colors of [null, [], [rgb], [rgb, rgb], [rgb, rgb, rgb, rgb], Array(3),
    ...[null, [], Array(3), [1, 2], [1, 2, 3, 4], [1, NaN, 3], [1, -1, 3], [1, 256, 3], [1, 2.5, 3]].map(invalid => [rgb, invalid, rgb]),
  ]) assert.throws(() => averageSkinColors(colors), RangeError);
});

function fixture(width, height, pixels) {
  return { width, height, data: new Uint8ClampedArray(pixels.flat()) };
}
test('uses patch median so isolated glare and shadow do not dictate color', () => {
  const skin = [201, 150, 111, 255];
  const result = sampleSkinPatch(fixture(3, 3, [skin, skin, skin, skin, [255, 255, 255, 255], skin, skin, skin, [0, 0, 0, 255]]), 1, 1, 1);
  assert.equal(result.hex, '#c9966f');
  assert.equal(result.sampleCount, 9);
});
test('clips sampling patch at image edges and clamps coordinates', () => {
  const image = fixture(2, 2, [[10, 20, 30, 255], [30, 40, 50, 255], [50, 60, 70, 255], [70, 80, 90, 255]]);
  assert.deepEqual(sampleSkinPatch(image, -4, -4, 1).rgb, [40, 50, 60]);
  assert.equal(sampleSkinPatch(image, 100, 100, 0).hex, '#46505a');
});
test('rejects mostly transparent regions and ignores translucent RGB', () => {
  assert.equal(sampleSkinPatch(fixture(2, 1, [[255, 0, 0, 0], [255, 0, 0, 128]]), 0, 0, 1), null);
  const mixed = fixture(3, 1, [[10, 20, 30, 255], [10, 20, 30, 255], [255, 0, 0, 0]]);
  assert.equal(sampleSkinPatch(mixed, 1, 0, 1).hex, '#0a141e');
});
test('rejects invalid dimensions, buffers, coordinates and patch radii', () => {
  const image = fixture(1, 1, [[10, 20, 30, 255]]);
  for (const value of [{ ...image, width: 0 }, { ...image, height: 1.5 }, { ...image, data: new Uint8ClampedArray(3) }]) {
    assert.throws(() => sampleSkinPatch(value, 0, 0), RangeError);
  }
  for (const [x, y, radius] of [[NaN, 0, 1], [0, Infinity, 1], [0, 0, -1], [0, 0, 101], [0, 0, 0.5]]) {
    assert.throws(() => sampleSkinPatch(image, x, y, radius), RangeError);
  }
});


const patch = rgb => sampleSkinPatch(fixture(1, 1, [[...rgb, 255]]), 0, 0, 0);
const linear = channel => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};
const luminance = rgb => rgb.map(linear).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);

test('clippedFraction counts any near-clipped RGB channel among opaque samples only', () => {
  const image = fixture(5, 1, [[250, 120, 120, 255], [120, 251, 120, 255], [120, 120, 249, 255], [255, 255, 255, 249], [100, 100, 100, 255]]);
  const result = sampleSkinPatch(image, 2, 0, 3);
  assert.equal(result.sampleCount, 4);
  assert.equal(result.clippedFraction, 0.5);
});

test('neutral reference leaves sRGB colours unchanged including channel transfer boundaries', () => {
  for (const level of [80, 128, 200, 249]) {
    const balance = createWhiteBalance(patch([level, level, level]));
    assert.equal(balance.ok, true);
    for (const gain of balance.gains) assert.ok(Math.abs(gain - 1) < 1e-14);
    for (const rgb of [[0, 0, 0], [1, 10, 11], [190, 145, 110], [255, 255, 255]]) {
      assert.deepEqual(applyWhiteBalance(rgb, balance).rgb, rgb);
      assert.equal(applyWhiteBalance(rgb, balance).clipped, false);
    }
  }
});

test('known warm cast is neutralized in linear sRGB and preserves reference luminance', () => {
  const reference = patch([220, 200, 180]);
  const balance = createWhiteBalance(reference);
  assert.equal(balance.ok, true);
  assert.deepEqual(applyWhiteBalance([190, 145, 110], balance), { hex: '#af937d', rgb: [175, 147, 125], clipped: false });
  const corrected = applyWhiteBalance(reference.rgb, balance);
  assert.deepEqual(corrected.rgb, [203, 203, 203]);
  assert.ok(Math.abs(luminance(corrected.rgb) - luminance(reference.rgb)) < 0.005);
  assert.ok(corrected.rgb[0] < 220, 'Reference must retain its measured luminance rather than become white');
  const target = luminance(reference.rgb);
  reference.rgb.forEach((channel, index) => assert.ok(Math.abs(linear(channel) * balance.gains[index] - target) < 1e-14));
});

test('white references reject clipping, darkness and extreme casts with distinct reasons', () => {
  const neutral = patch([200, 200, 200]);
  assert.equal(createWhiteBalance({ ...neutral, clippedFraction: 0.049 }).ok, true);
  for (const clippedFraction of [0.05, 0.1, 1]) assert.deepEqual(createWhiteBalance({ ...neutral, clippedFraction }), { ok: false, reason: 'clipped' });
  assert.deepEqual(createWhiteBalance(patch([250, 250, 250])), { ok: false, reason: 'clipped' });
  for (const rgb of [[0, 0, 0], [20, 30, 40], [79, 79, 79]]) assert.deepEqual(createWhiteBalance(patch(rgb)), { ok: false, reason: 'dark' });
  for (const rgb of [[200, 150, 0], [200, 200, 90], [240, 80, 80]]) assert.deepEqual(createWhiteBalance(patch(rgb)), { ok: false, reason: 'cast' });
});

test('out-of-gamut correction reports clipping before clamping to display HEX', () => {
  const balance = createWhiteBalance(patch([220, 200, 180]));
  assert.equal(balance.ok, true);
  const corrected = applyWhiteBalance([200, 220, 250], balance);
  assert.equal(corrected.clipped, true);
  assert.equal(corrected.rgb[2], 255);
  assert.match(corrected.hex, /^#[0-9a-f]{6}$/);
  assert.equal(applyWhiteBalance([0, 0, 0], balance).clipped, false);
  assert.equal(applyWhiteBalance([255, 255, 255], { ok: true, gains: [1, 1, 1] }).clipped, false);
});

test('white balance rejects malformed runtime values without returning NaN or invalid colours', () => {
  const neutral = patch([200, 200, 200]);
  for (const reference of [null, {}, { ...neutral, hex: '#000000' },
    ...[[], [1, 2], [1, 2, 3, 4], [1, NaN, 3], [1, Infinity, 3], [1, -1, 3], [1, 256, 3], [1, 2.5, 3]].map(rgb => ({ ...neutral, rgb })),
    ...[undefined, NaN, Infinity, -0.1, 1.1].map(clippedFraction => ({ ...neutral, clippedFraction })),
    ...[0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1].map(sampleCount => ({ ...neutral, sampleCount })),
  ]) assert.throws(() => createWhiteBalance(reference), RangeError);
  for (const rgb of [null, [], [1, 2], [1, 2, 3, 4], [1, NaN, 3], [1, Infinity, 3], [1, -1, 3], [1, 256, 3], [1, 2.5, 3]]) {
    assert.throws(() => applyWhiteBalance(rgb, { ok: true, gains: [1, 1, 1] }), RangeError);
  }
  for (const balance of [null, {}, { ok: false, reason: 'dark' }, { ok: true, gains: [] },
    { ok: true, gains: [1, 1] }, { ok: true, gains: [1, 1, 1, 1] },
    ...[NaN, Infinity, 0, 0.49, 2.01, '1'].map(gain => ({ ok: true, gains: [1, gain, 1] })),
  ]) assert.throws(() => applyWhiteBalance([200, 150, 100], balance), RangeError);
});
