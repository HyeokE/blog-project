export function normalizeRollingValue(value) {
  return Number.isFinite(value) ? Math.trunc(value) : 0;
}
export function formatRollingValue(value, locale = 'ko-KR') {
  return new Intl.NumberFormat(locale, {maximumFractionDigits:0}).format(normalizeRollingValue(value));
}
export function digitPlaces(previous, current) {
  const a = String(Math.abs(normalizeRollingValue(previous)));
  const b = String(Math.abs(normalizeRollingValue(current)));
  const length = Math.max(a.length,b.length);
  return Array.from({length},(_,i)=>({place:length-i-1,digit:Number(b.padStart(length,' ')[i])||0,exists:i>=length-b.length}));
}
