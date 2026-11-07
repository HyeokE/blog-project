// App-defined display bands for web swatches, not universal perception or skin-match thresholds.
export const DIFFERENCE_STEPS = [
  { level: 1, label: '거의 같음', upperBound: 1, rangeLabel: '0–1 미만' },
  { level: 2, label: '미세 차이', upperBound: 2, rangeLabel: '1–2 미만' },
  { level: 3, label: '약간 차이', upperBound: 3, rangeLabel: '2–3 미만' },
  { level: 4, label: '차이 있음', upperBound: 5, rangeLabel: '3–5 미만' },
  { level: 5, label: '큰 차이', upperBound: Infinity, rangeLabel: '5 이상' },
];

export function describeDifference(deltaE) {
  if (!Number.isFinite(deltaE) || deltaE < 0) {
    throw new RangeError('Color difference must be finite and non-negative');
  }
  const value = deltaE.toFixed(2);
  // Classify the displayed precision so a rounded boundary never contradicts its visible range.
  const step = DIFFERENCE_STEPS.find(candidate => Number(value) < candidate.upperBound);
  return { ...step, value };
}
