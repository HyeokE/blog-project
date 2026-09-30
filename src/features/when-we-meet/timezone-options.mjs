const fallback = ['UTC', 'Asia/Seoul'];

export function deviceTimezone(intl = Intl) {
  try {
    const zone = intl.DateTimeFormat().resolvedOptions().timeZone;
    return isValidTimezone(zone) ? zone : 'UTC';
  } catch { return 'UTC'; }
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
