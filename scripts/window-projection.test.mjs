import assert from 'node:assert/strict';
import test from 'node:test';
import { projectWindowPoint, windowProjectionTransform } from '../src/container/light-wall/window-projection.ts';

const sizes = [[390, 844], [430, 932], [844, 390], [1440, 900]];
const points = [[0.22, 0.12], [0.65, 0.58], [0.71, 0.64], [0.98, 2], [0, 0], [1, 1]];

function apply(css, x, y) {
  const matrix = css.slice('matrix3d('.length, -1).split(',').map(Number);
  const divisor = matrix[3] * x + matrix[7] * y + matrix[15];
  return [(matrix[0] * x + matrix[4] * y + matrix[12]) / divisor,
    (matrix[1] * x + matrix[5] * y + matrix[13]) / divisor];
}

for (const [width, height] of sizes) {
  test(`composited projection matches original pane geometry at ${width}x${height}`, () => {
    for (const endpoint of [0, 1]) {
      for (let step = 0; step <= 100; step++) {
        const progress = step / 100;
        const transform = windowProjectionTransform(progress, endpoint, width, height);
        for (const [x, y] of points) {
          const [initialX, initialY] = projectWindowPoint(x, y, endpoint);
          const [expectedX, expectedY] = projectWindowPoint(x, y, progress);
          const actual = apply(transform, initialX * width, (1 - initialY) * height);
          assert.ok(Math.abs(actual[0] - expectedX * width) < 1e-8);
          assert.ok(Math.abs(actual[1] - (1 - expectedY) * height) < 1e-8);
        }
      }
    }
  });
}

test('initial dawn and final settled textures use identity without a hydration jump', () => {
  for (const endpoint of [0, 1]) {
    assert.equal(windowProjectionTransform(endpoint, endpoint, 390, 844),
      'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)');
  }
});
