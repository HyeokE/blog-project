// sRGB conversion matrices and white points: W3C CSS Color 4, section 19.
// https://www.w3.org/TR/css-color-4/#color-conversion-code
const srgbToXyz = [
  [506752 / 1228815, 87881 / 245763, 12673 / 70218],
  [87098 / 409605, 175762 / 245763, 12673 / 175545],
  [7918 / 409605, 87881 / 737289, 1001167 / 1053270],
];
const d65ToD50 = [
  [1.0479297925449969, 0.022946870601609652, -0.05019226628920524],
  [0.02962780877005599, 0.9904344267538799, -0.017073799063418826],
  [-0.009243040646204504, 0.015055191490298152, 0.7518742814281371],
];
const d50 = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];
const multiply = (matrix, vector) =>
  matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));

/** The six-digit color code used by the UI is the canonical comparison input. */
export function hexToRgb(hex) {
  if (typeof hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new RangeError('Hex needs six hexadecimal digits prefixed with #');
  }
  return [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16));
}

/** Website swatches are treated as sRGB; output is CIELAB with D50 white. */
export function rgbToLab(rgb) {
  if (
    rgb.length !== 3 ||
    rgb.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 255)
  ) {
    throw new RangeError('RGB needs three finite channels in [0, 255]');
  }
  const linear = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const xyz = multiply(d65ToD50, multiply(srgbToXyz, linear));
  const f = xyz.map((value, index) => {
    const relative = value / d50[index];
    return relative > 216 / 24389 ? Math.cbrt(relative) : ((24389 / 27) * relative + 16) / 116;
  });
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

// Sharma, Wu & Dalal (2005), equations 2–22. Standard kL = kC = kH = 1.
// https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/
// Validated against all 34 published reference pairs in shade-matching.test.mjs.
export function deltaE2000(first, second) {
  const [l1, a1, b1] = first;
  const [l2, a2, b2] = second;
  const rad = Math.PI / 180;
  const meanChroma = (Math.hypot(a1, b1) + Math.hypot(a2, b2)) / 2;
  const g = 0.5 * (1 - Math.sqrt(meanChroma ** 7 / (meanChroma ** 7 + 25 ** 7)));
  const a1Prime = (1 + g) * a1;
  const a2Prime = (1 + g) * a2;
  const c1 = Math.hypot(a1Prime, b1);
  const c2 = Math.hypot(a2Prime, b2);
  const hue = (a, b) => {
    const degrees = Math.atan2(b, a) / rad;
    return degrees < 0 ? degrees + 360 : degrees;
  };
  const h1 = c1 === 0 ? 0 : hue(a1Prime, b1);
  const h2 = c2 === 0 ? 0 : hue(a2Prime, b2);
  const deltaL = l2 - l1;
  const deltaC = c2 - c1;
  const hueDifference = h2 - h1;
  const hueSum = h1 + h2;
  let deltaHue = c1 * c2 === 0 ? 0 : hueDifference;
  if (deltaHue > 180) deltaHue -= 360;
  if (deltaHue < -180) deltaHue += 360;
  const deltaH = 2 * Math.sqrt(c1 * c2) * Math.sin((deltaHue * rad) / 2);
  const meanL = (l1 + l2) / 2;
  const meanC = (c1 + c2) / 2;
  let meanH = hueSum;
  if (c1 * c2 !== 0) {
    meanH =
      Math.abs(hueDifference) <= 180 ? hueSum / 2 : (hueSum + (hueSum < 360 ? 360 : -360)) / 2;
  }
  const t =
    1 -
    0.17 * Math.cos((meanH - 30) * rad) +
    0.24 * Math.cos(2 * meanH * rad) +
    0.32 * Math.cos((3 * meanH + 6) * rad) -
    0.2 * Math.cos((4 * meanH - 63) * rad);
  const sL = 1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2);
  const sC = 1 + 0.045 * meanC;
  const sH = 1 + 0.015 * meanC * t;
  const rotation =
    -2 *
    Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)) *
    Math.sin(60 * Math.exp(-(((meanH - 275) / 25) ** 2)) * rad);
  const lightness = deltaL / sL;
  const chroma = deltaC / sC;
  const hueTerm = deltaH / sH;
  return Math.sqrt(
    Math.max(0, lightness ** 2 + chroma ** 2 + hueTerm ** 2 + rotation * chroma * hueTerm),
  );
}

const compareId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** One nearest swatch per other product, ordered by unrounded ΔE, then stable IDs. */
export function findSimilarShades(catalog, sourceShadeId, filters = {}) {
  let source;
  for (const product of catalog.products) {
    const shade = product.shades.find((candidate) => candidate.id === sourceShadeId);
    if (shade) {
      source = { product, shade };
      break;
    }
  }
  if (!source) return [];
  const limit = filters.limit ?? 12;
  if (limit !== Infinity && (!Number.isInteger(limit) || limit < 0)) {
    throw new RangeError('Match limit must be a non-negative integer or Infinity');
  }
  if (limit === 0) return [];
  const sourceLab = rgbToLab(hexToRgb(source.shade.hex));
  const results = [];
  for (const product of catalog.products) {
    if (product.id === source.product.id) continue;
    if (filters.type && filters.type !== 'all' && product.type !== filters.type) continue;
    if (filters.brandId && product.brandId !== filters.brandId) continue;
    let closest;
    for (const shade of product.shades) {
      const deltaE = deltaE2000(sourceLab, rgbToLab(hexToRgb(shade.hex)));
      if (
        !closest ||
        deltaE < closest.deltaE ||
        (deltaE === closest.deltaE && compareId(shade.id, closest.shade.id) < 0)
      ) {
        closest = { product, shade, deltaE };
      }
    }
    if (closest) results.push(closest);
  }
  results.sort(
    (a, b) =>
      a.deltaE - b.deltaE ||
      compareId(a.product.id, b.product.id) ||
      compareId(a.shade.id, b.shade.id),
  );
  return results.slice(0, limit);
}
