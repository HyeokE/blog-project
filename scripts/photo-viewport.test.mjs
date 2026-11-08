import assert from 'node:assert/strict';
import test from 'node:test';
import { clampPhotoView, photoPointAt, photoPointInView, zoomPhotoAt, panPhotoBy } from '../src/features/shade-finder/photo-viewport.mjs';
import { sampleSkinPatch } from '../src/features/shade-finder/skin-sampling.mjs';

const fit = { scale: 1, x: 0, y: 0 };
const center = { x: 0.5, y: 0.5 };
const near = (actual, expected) => {
  assert.ok(Math.abs(actual.x - expected.x) < 1e-10);
  assert.ok(Math.abs(actual.y - expected.y) < 1e-10);
};

test('zoom preserves the source point under the control anchor', () => {
  const anchor = { x: 0.25, y: 0.75 };
  const zoomed = zoomPhotoAt(fit, 3, anchor);
  assert.deepEqual(zoomed, { scale: 3, x: -0.5, y: -1.5 });
  near(photoPointAt(zoomed, anchor), anchor);
  assert.deepEqual(zoomPhotoAt(zoomed, 1, anchor), fit);
});

test('pinch can scale and move its centroid without changing the anchored image point', () => {
  const start = { scale: 2, x: -0.5, y: -0.5 };
  const target = { x: 0.6, y: 0.4 };
  const next = zoomPhotoAt(start, 3, center, target);
  near(photoPointAt(next, target), photoPointAt(start, center));
});

test('panning and zoom limits keep the image covering the viewport', () => {
  assert.deepEqual(panPhotoBy(fit, 10, -10), fit);
  assert.deepEqual(panPhotoBy({ scale: 3, x: -1, y: -1 }, 20, -20), { scale: 3, x: 0, y: -2 });
  assert.deepEqual(clampPhotoView({ scale: 10, x: -20, y: 20 }), { scale: 4, x: -3, y: 0 });
  assert.deepEqual(clampPhotoView({ scale: 0, x: -2, y: 4 }), fit);
  assert.equal(zoomPhotoAt(fit, 10, center).scale, 4);
});

test('forward and inverse transforms agree at edges and fractional zoom', () => {
  for (const view of [fit, { scale: 1.75, x: -0.25, y: -0.7 }, { scale: 4, x: -3, y: -2 }]) {
    for (const point of [{ x: 0, y: 0 }, center, { x: 1, y: 1 }]) {
      near(photoPointAt(view, photoPointInView(view, point)), point);
    }
  }
});

test('sampling the same image point after zoom and pan keeps its original colour', () => {
  const width = 100;
  const height = 60;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row++) for (let column = 0; column < width; column++) {
    data.set([column * 2, row * 3, 120, 255], (row * width + column) * 4);
  }
  const image = { width, height, data };
  const source = { x: 0.65, y: 0.4 };
  const view = panPhotoBy(zoomPhotoAt(fit, 3, source), -0.1, 0.15);
  const restored = photoPointAt(view, photoPointInView(view, source));
  assert.deepEqual(sampleSkinPatch(image, restored.x * (width - 1), restored.y * (height - 1), 2),
    sampleSkinPatch(image, source.x * (width - 1), source.y * (height - 1), 2));
});

test('rejects non-finite transforms instead of producing unusable coordinates', () => {
  assert.throws(() => clampPhotoView({ scale: NaN, x: 0, y: 0 }), RangeError);
  assert.throws(() => panPhotoBy(fit, Infinity, 0), RangeError);
  assert.throws(() => zoomPhotoAt(fit, Infinity, center), RangeError);
  assert.throws(() => photoPointAt(fit, { x: NaN, y: 0 }), RangeError);
});
