import { hexToRgb, rgbToLab } from './matching.mjs';

const axes = [
  { key: 'lightness', label: '색 밝기', less: '더 어두워요', more: '더 밝아요', slightlyLess: '조금 더 어두워요', slightlyMore: '조금 더 밝아요' },
  { key: 'chroma', label: '채도', less: '더 차분해요', more: '더 선명해요', slightlyLess: '조금 더 차분해요', slightlyMore: '조금 더 선명해요' },
  { key: 'redness', label: '붉은기', less: '붉은기가 적어요', more: '붉은기가 많아요', slightlyLess: '조금 적어요', slightlyMore: '조금 많아요' },
  { key: 'yellowness', label: '노란기', less: '노란기가 적어요', more: '노란기가 많아요', slightlyLess: '조금 적어요', slightlyMore: '조금 많아요' },
];

function components(hex) {
  const [lightness, redness, yellowness] = rgbToLab(hexToRgb(hex));
  return [lightness, Math.hypot(redness, yellowness), redness, yellowness];
}

/**
 * Compares target swatch components with the selected source in D50 CIELAB.
 * C* is a chroma proxy for the UI's 채도 label, not physical saturation.
 * Differences below 1 use softer wording while preserving their direction.
 * This is an app presentation choice, not a validated perceptual threshold.
 * Redness and yellowness remain independent; neither diagnoses a
 * person's undertone or determines whether a product is warm or cool toned.
 */
export function compareShadeColors(sourceHex, targetHex) {
  const source = components(sourceHex);
  const target = components(targetHex);
  return axes.map(({ key, label, less, more, slightlyLess, slightlyMore }, index) => {
    const delta = target[index] - source[index];
    // Ignore floating-point noise only, not small color differences.
    const direction = Math.abs(delta) < 1e-9 ? 0 : delta > 0 ? 1 : -1;
    const description = direction === 0
      ? '같아요'
      : Math.abs(delta) < 1
        ? direction > 0 ? slightlyMore : slightlyLess
        : direction > 0
          ? more
          : less;

    return { key, label, description, direction };
  });
}
