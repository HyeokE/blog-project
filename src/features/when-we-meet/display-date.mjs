export function formatCraftDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || '';
  return value.replaceAll('-', '.');
}

export function formatCraftInstant(value, timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(value));
  const part = type => parts.find(item => item.type === type)?.value;
  return `${part('year')}.${part('month')}.${part('day')} ${part('hour')}:${part('minute')}`;
}
