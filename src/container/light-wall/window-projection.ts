/** Shared by the SVG inverse projection and the WebGL forward projection. */
export const WINDOW_DAWN = {
  sourceX: 1.05,
  sourceY: 1.02,
  compressionX: 1.12,
  compressionY: 0.88,
  shear: 0.3,
  tilt: 0.08,
  drop: -0.12,
  perspectiveX: 0.12,
  perspectiveY: 0.1,
} as const;

const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

/** Inverse of WallLighting's windowUv mapping, in normalized bottom-left screen coordinates. */
export function projectWindowPoint(x: number, y: number, progress: number): [number, number] {
  const p = Math.max(0, Math.min(1, progress));
  const shear = mix(WINDOW_DAWN.shear, 0.55, p);
  const tilt = mix(WINDOW_DAWN.tilt, 0.16, p);
  const shiftedX = x - shear * 0.5;
  const shiftedY = y - mix(WINDOW_DAWN.drop, 0, p);
  const determinant = 1 + shear * tilt;
  const projectedX = (shiftedX + shear * shiftedY) / determinant;
  const projectedY = (shiftedY - tilt * shiftedX) / determinant;
  if (p === 1) {
    return [projectedX, projectedY];
  }
  const rayX = (projectedX - WINDOW_DAWN.sourceX) / mix(WINDOW_DAWN.compressionX, 1, p);
  const rayY = (projectedY - WINDOW_DAWN.sourceY) / mix(WINDOW_DAWN.compressionY, 1, p);
  const denominator =
    1 - (1 - p) * (WINDOW_DAWN.perspectiveX * rayX + WINDOW_DAWN.perspectiveY * rayY);
  return [WINDOW_DAWN.sourceX + rayX / denominator, WINDOW_DAWN.sourceY + rayY / denominator];
}

type Matrix = [number, number, number, number, number, number, number, number, number];

function multiply(a: Matrix, b: Matrix): Matrix {
  return Array.from({ length: 9 }, (_, index) => {
    const row = Math.floor(index / 3) * 3;
    const column = index % 3;
    return a[row] * b[column] + a[row + 1] * b[column + 3] + a[row + 2] * b[column + 6];
  }) as Matrix;
}

function inverse([a, b, c, d, e, f, g, h, i]: Matrix): Matrix {
  const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
  return [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i,
    a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d]
    .map((value) => value / determinant) as Matrix;
}

/** Unit-square homography, in the SVG's top-left coordinate system. */
function projection(progress: number): Matrix {
  const points = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([x, y]) => {
    const [px, py] = projectWindowPoint(x, y, progress);
    return [px, 1 - py];
  });
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = points;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy3 = y0 - y1 + y2 - y3;
  const determinant = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0,
    y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

const inverseDawn = inverse(projection(0));
const inverseSettled = inverse(projection(1));

/** Map an already rasterized endpoint onto the moving projection, using only a CSS transform. */
export function windowProjectionTransform(progress: number, endpoint: 0 | 1, width: number, height: number) {
  if (progress === endpoint) {
    return 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1)';
  }
  const matrix = multiply(projection(progress), endpoint === 0 ? inverseDawn : inverseSettled);
  const [a, b, c, d, e, f, g, h, i] = matrix.map((value) => value / matrix[8]);
  return `matrix3d(${[a, d * height / width, 0, g / width,
    b * width / height, e, 0, h / height, 0, 0, 1, 0, c * width, f * height, 0, i].join(',')})`;
}

