import { datesInRange } from './date-availability.mjs';
import { todayInTimezone } from './creation-validation.mjs';
const validText = (value, max) =>
  typeof value === 'string' &&
  value.trim().length > 0 &&
  value.trim().length <= max &&
  !/[\u0000-\u001f\u007f]/.test(value);
/** Pure field codes; callers translate them and retain their staged values. */
export function validateDateSettings(draft, { room, now = new Date() } = {}) {
  const errors = {};
  if (!validText(draft?.title, 100)) errors.title = 'invalid';
  if (!validText(draft?.name, 50)) errors.name = 'invalid';
  const zone = draft?.timezone;
  const today =
    typeof zone === 'string' && zone.length <= 64 && zone === zone.trim() && !/^[+\-\d]/.test(zone)
      ? todayInTimezone(zone, now)
      : null;
  if (!today) errors.timezone = 'invalid';
  try {
    datesInRange(draft?.startDate, draft?.endDate);
  } catch {
    errors.dates = 'invalid';
  }
  if (!errors.dates && today && draft.startDate < today && draft.startDate !== room?.startDate)
    errors.dates = 'past';
  return errors;
}
