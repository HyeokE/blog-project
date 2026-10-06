import { isCalendarDate, datesInRange, mergeAvailableDateChanges } from './date-availability.mjs';
export function toLocalDate(value) {
  if (!isCalendarDate(value)) throw new RangeError('Invalid civil date.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setHours(12, 0, 0, 0);
  date.setFullYear(year, month - 1, day);
  return date;
}
export function fromLocalDate(date) {
  const value = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (!isCalendarDate(value)) throw new RangeError('Invalid civil date.');
  return value;
}
export function rebaseDateDraft(base, desired, current) {
  return {
    name: desired.name === base.name ? current.name : desired.name,
    availableDates: mergeAvailableDateChanges(
      base.availableDates,
      desired.availableDates,
      current.availableDates,
    ),
  };
}
export function constrainDateDraft(value, room) {
  const allowed = new Set(datesInRange(room.startDate, room.endDate));
  const availableDates = value.availableDates.filter((date) => allowed.has(date));
  return {
    value: { ...value, availableDates },
    removed: availableDates.length !== value.availableDates.length,
  };
}
