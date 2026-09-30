const fallback = ['UTC', 'Asia/Seoul'];

// Browsers with fingerprinting protection report UTC whatever the real zone; for Korean UI that is almost
// never what the person means, so fall back to Seoul. Other locales keep the reported zone.
const LOCALE_ZONES = { ko: 'Asia/Seoul' };
export function deviceTimezone(intl = Intl, locale) {
  let zone = 'UTC';
  try {
    const reported = intl.DateTimeFormat().resolvedOptions().timeZone;
    if (isValidTimezone(reported)) zone = reported;
  } catch { /* keep UTC */ }
  return /^(Etc\/)?(UTC|GMT|Universal|Zulu)$/.test(zone) && LOCALE_ZONES[locale] ? LOCALE_ZONES[locale] : zone;
}
const aliases = { 'Asia/Seoul': '서울 한국 korea' };

export function timezoneOptions(intl = Intl) {
  try {
    const supported = intl.supportedValuesOf('timeZone');
    return [...new Set([...fallback, ...supported])].sort((a, b) => a.localeCompare(b));
  } catch {
    return fallback;
  }
}

export function isValidTimezone(value) {
  return typeof value === 'string' && timezoneOptions().includes(value);
}

export function searchTimezones(query, options = timezoneOptions()) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return options.filter(zone => {
    const haystack = `${zone} ${zone.replaceAll('_', ' ').replaceAll('/', ' ')} ${aliases[zone] || ''}`.toLocaleLowerCase();
    return terms.every(term => haystack.includes(term));
  });
}

export function timezoneOffset(zone, referenceDate) {
  const validDate = typeof referenceDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDate) &&
    !Number.isNaN(Date.parse(`${referenceDate}T12:00:00Z`)) &&
    new Date(`${referenceDate}T12:00:00Z`).toISOString().slice(0, 10) === referenceDate;
  const instant = validDate ? new Date(`${referenceDate}T12:00:00Z`) : new Date();
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' }).formatToParts(instant);
  const raw = parts.find(part => part.type === 'timeZoneName')?.value || 'GMT';
  if (raw === 'GMT') return 'UTC+00:00';
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(raw);
  if (!match) return raw.replace('GMT', 'UTC');
  return `UTC${match[1] === '-' ? '−' : '+'}${match[2].padStart(2, '0')}:${match[3] || '00'}`;
}

/** Scroll delta that reveals an option inside the list viewport. `center` (on open) puts the selected
 * option mid-list; `nearest` (arrow keys) moves only as far as needed. Rects need top and height. */
export function revealScrollDelta(option, viewport, mode = 'nearest') {
  const offset = option.top - viewport.top;
  if (mode === 'center') return offset - (viewport.height - option.height) / 2;
  if (offset < 0) return offset;
  const overflow = offset + option.height - viewport.height;
  return overflow > 0 ? overflow : 0;
}
