import { isCalendarDate, nextCalendarDate, datesInRange } from './date-availability.mjs';
const uuid = (x) =>
  typeof x === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
const record = (x) =>
  x !== null &&
  typeof x === 'object' &&
  !Array.isArray(x) &&
  Object.getPrototypeOf(x) === Object.prototype;
export const eligibleDateEmail = (x) =>
  typeof x === 'string' &&
  x === x.trim() &&
  /^[^\s@\x00-\x1f\x7f]+@[^\s@.\x00-\x1f\x7f]+(?:\.[^\s@.\x00-\x1f\x7f]+)+$/.test(x);
const fail = () => {
  throw Error('Invalid date review');
};
function list(x, predicate) {
  if (!Array.isArray(x)) fail();
  for (let i = 0; i < x.length; i++) if (!Object.hasOwn(x, i) || !predicate(x[i])) fail();
  return x;
}
function roster(x, review) {
  list(
    x,
    (p) =>
      record(p) &&
      uuid(p.userId) &&
      typeof p.displayName === 'string' &&
      !!p.displayName.trim() &&
      p.displayName.length <= 100 &&
      typeof p.hasAvailability === 'boolean' &&
      (review ? p.email === null || eligibleDateEmail(p.email) : typeof p.isAdmin === 'boolean'),
  );
  if (new Set(x.map((p) => p.userId)).size !== x.length) fail();
  return x.map((p) => ({ ...p }));
}
export function saveDateConfirmReturn(storage, roomId, userId, now = Date.now()) {
  if (!uuid(roomId) || !uuid(userId)) return;
  try {
    storage.setItem(
      `wwm:return-tab:${roomId}`,
      JSON.stringify({ version: 1, userId, expires: now + 600000, tab: 'date-confirm' }),
    );
  } catch {
    /* storage is optional */
  }
}
export function consumeDateConfirmReturn(storage, roomId, userId, search, now = Date.now()) {
  try {
    if (!['connected', 'denied', 'error'].includes(new URLSearchParams(search).get('calendar')))
      return false;
    const key = `wwm:return-tab:${roomId}`,
      raw = storage.getItem(key);
    if (!raw) return false;
    storage.removeItem(key);
    const value = JSON.parse(raw);
    return (
      record(value) &&
      value.version === 1 &&
      value.tab === 'date-confirm' &&
      value.userId === userId &&
      Number.isSafeInteger(value.expires) &&
      value.expires > now &&
      value.expires <= now + 600000
    );
  } catch {
    return false;
  }
}
export function normalizeDatePeople(x) {
  return roster(x, false);
}
function status(x) {
  if (
    !record(x) ||
    x.scheduleMode !== 'date' ||
    !['pending', 'reconciling', 'confirmed', 'reverted'].includes(x.status) ||
    !Number.isSafeInteger(x.revision) ||
    x.revision < 1 ||
    typeof x.title !== 'string' ||
    !x.title.trim() ||
    x.title.length > 100 ||
    x.title !== x.title.trim() ||
    /[\x00-\x1f\x7f-\x9f]/.test(x.title) ||
    !isCalendarDate(x.startDate) ||
    nextCalendarDate(x.startDate) !== x.endDate ||
    typeof x.timezone !== 'string' ||
    /^[+-]/.test(x.timezone)
  )
    fail();
  try {
    new Intl.DateTimeFormat('en', { timeZone: x.timezone });
  } catch {
    fail();
  }
  if (
    x.url !== null &&
    (typeof x.url !== 'string' || !/^https:\/\/www\.google\.com\/calendar\//.test(x.url))
  )
    fail();
  if (x.status === 'confirmed' && !x.url) fail();
  return {
    revision: x.revision,
    status: x.status,
    scheduleMode: x.scheduleMode,
    title: x.title,
    startDate: x.startDate,
    endDate: x.endDate,
    timezone: x.timezone,
    url: x.url,
  };
}
function snapshot(x, room) {
  if (!record(x) || !record(x.valid)) fail();
  const v = x.valid;
  status({ ...v, status: x.status, url: x.url });
  if (v.roomId !== room.id || v.date !== v.startDate) fail();
  list(
    v.recipients,
    (p) =>
      record(p) && uuid(p.userId) && eligibleDateEmail(p.email) && typeof p.optional === 'boolean',
  );
  list(v.excluded, uuid);
  const ids = [...v.recipients.map((p) => p.userId), ...v.excluded];
  if (!v.recipients.length || new Set(ids).size !== ids.length) fail();
  return structuredClone(x);
}
export function normalizeDateReview(x, room, userId) {
  if (!record(x) || !uuid(userId)) fail();
  const s = x.status === null ? null : status(x.status);
  if (room.role !== 'ADMIN') {
    if (x.owner !== null || x.review !== null) fail();
    return { status: s, owner: null, review: null };
  }
  if (room.ownerId !== userId || !record(x.review)) fail();
  const review = { attendees: roster(x.review.attendees, true) };
  let owner = null;
  if (x.owner !== null) {
    if (
      !record(x.owner) ||
      x.owner.root?.organizerId !== userId ||
      !eligibleDateEmail(x.owner.root?.organizerEmail)
    )
      fail();
    const root = snapshot(x.owner.root, room);
    const revisions = list(x.owner.revisions, (p) => record(p)).map((p) => snapshot(p, room));
    let pending = null;
    if (x.owner.pending !== null) {
      pending = snapshot(x.owner.pending, room);
      snapshot({ valid: pending.previous, status: 'confirmed', url: root.url }, room);
    }
    owner = { root, revisions, pending };
  }
  return { status: s, owner, review };
}
export function buildDateProposal(room, attendees, draft) {
  roster(attendees, true);
  const { date, title, revision } = draft;
  if (
    !datesInRange(room.startDate, room.endDate).includes(date) ||
    typeof title !== 'string' ||
    !title.trim() ||
    title.trim().length > 100 ||
    /[\x00-\x1f\x7f-\x9f]/.test(title) ||
    !Number.isSafeInteger(revision) ||
    revision < 1
  )
    fail();
  list(draft.recipients, uuid);
  list(draft.optional, uuid);
  const recipients = [...draft.recipients],
    optional = [...draft.optional];
  if (
    !recipients.length ||
    new Set(recipients).size !== recipients.length ||
    new Set(optional).size !== optional.length ||
    optional.some((id) => !recipients.includes(id))
  )
    fail();
  const selected = recipients.map((id) => attendees.find((p) => p.userId === id));
  if (
    selected.some((p) => !p || !eligibleDateEmail(p.email)) ||
    new Set(selected.map((p) => p.email.toLowerCase())).size !== selected.length
  )
    fail();
  return {
    date,
    title: title.trim(),
    revision,
    recipients,
    excluded: attendees.filter((p) => !recipients.includes(p.userId)).map((p) => p.userId),
    optional,
  };
}
