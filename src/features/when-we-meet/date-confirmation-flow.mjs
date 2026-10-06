import { buildDateCalendarInsert, matchesDateCalendarEvent } from './date-confirmation.mjs';

/** Server callers authorize the owner and bind reservation/hash/root ID to trusted snapshots.
 * New proposals are validated separately. Persisted snapshots MUST NOT be rebuilt using the
 * current room range/timezone/roster. This module has no auth, transport, tokens or storage.
 * getEvent returns null only for definite absence; adapters must preserve unknown failures.
 * patchEvent's third argument MUST become If-Match; all writes use sendUpdates=all.
 * finalize returns the actual durable status, never an optimistic requested status.
 */
const matches = (event, valid, id) => event?.id === id && matchesDateCalendarEvent(event, valid);
const definite = (error) =>
  error?.definite === true &&
  Number.isInteger(error.status) &&
  error.status >= 400 &&
  error.status < 500 &&
  ![408, 409, 429].includes(error.status);
const etag = (event) => typeof event?.etag === 'string' && event.etag.trim().length > 0;
function check(valid, eventId) {
  try {
    if (
      typeof eventId === 'string' &&
      /^[0-9a-v]{5,1024}$/.test(eventId) &&
      matchesDateCalendarEvent(buildDateCalendarInsert(valid), valid)
    )
      return;
  } catch {
    /* Malformed caller data never leaks incidental property access errors. */
  }
  throw new Error('Invalid date confirmation flow input');
}
async function finish(finalize, status, url) {
  try {
    return (await finalize(status, url)) === status;
  } catch {
    return false;
  }
}
async function uncertain(finalize) {
  await finish(finalize, 'reconciling');
  return { status: 'reconciling' };
}
async function confirmed(finalize, event) {
  return (await finish(finalize, 'confirmed', event.htmlLink))
    ? { status: 'confirmed', url: event.htmlLink }
    : { status: 'reconciling' };
}

export async function confirmDateMeeting({
  valid,
  eventId,
  reserve,
  getEvent,
  insertEvent,
  finalize,
}) {
  check(valid, eventId);
  const claim = await reserve();
  if (claim === 'conflict') return { status: 'conflict' };
  if (!['reserved', 'reserved_reconcile_required', 'reconcile', 'existing'].includes(claim))
    return uncertain(finalize);
  let event;
  try {
    event = await getEvent(eventId);
    if (event === null && ['reserved', 'reserved_reconcile_required'].includes(claim)) {
      try {
        await insertEvent({ ...buildDateCalendarInsert(valid), id: eventId });
      } catch (error) {
        if (error?.status !== 409) {
          if (definite(error))
            return (await finish(finalize, 'released'))
              ? { status: 'failed', message: 'Calendar rejected the invitation.' }
              : { status: 'reconciling' };
          return uncertain(finalize);
        }
      }
      event = await getEvent(eventId);
    }
  } catch {
    return uncertain(finalize);
  }
  return matches(event, valid, eventId) ? confirmed(finalize, event) : uncertain(finalize);
}

function patchBody(event, valid) {
  const body = buildDateCalendarInsert(valid);
  const existing = new Map(event.attendees.map((a) => [a.email.toLowerCase(), a]));
  body.attendees = body.attendees.map((a) => {
    const old = existing.get(a.email.toLowerCase());
    return { ...a, ...(old?.responseStatus ? { responseStatus: old.responseStatus } : {}) };
  });
  return body;
}

/** previous is the trusted persisted revision, not a proposal revalidated against today's room. */
export async function editDateMeeting({
  valid,
  previous,
  eventId,
  reserve,
  getEvent,
  patchEvent,
  finalize,
}) {
  check(valid, eventId);
  check(previous, eventId);
  if (valid.roomId !== previous.roomId || valid.revision !== previous.revision + 1)
    throw new Error('Invalid date confirmation flow input');
  const claim = await reserve();
  if (claim === 'conflict' || claim === 'not_confirmed') return { status: claim };
  if (!['reserved', 'reconcile', 'existing'].includes(claim)) return uncertain(finalize);
  let event;
  try {
    event = await getEvent(eventId);
    if (matches(event, valid, eventId)) return confirmed(finalize, event);
    // Existing means the database already committed; never blindly apply a second edit.
    if (claim === 'existing' || !matches(event, previous, eventId) || !etag(event))
      return uncertain(finalize);
    try {
      await patchEvent(eventId, patchBody(event, valid), event.etag);
    } catch (error) {
      if (definite(error)) {
        const old = await getEvent(eventId);
        if (matches(old, previous, eventId))
          return (await finish(finalize, 'reverted'))
            ? { status: 'failed', message: 'Calendar rejected the change.' }
            : { status: 'reconciling' };
      }
      return uncertain(finalize);
    }
    event = await getEvent(eventId);
  } catch {
    return uncertain(finalize);
  }
  return matches(event, valid, eventId) ? confirmed(finalize, event) : uncertain(finalize);
}

/** Sequence-only resend; ambiguous outcomes retain the durable rate-limit reservation. */
export async function resendDateMeeting({
  valid,
  eventId,
  reserve,
  getEvent,
  patchEvent,
  finalize,
}) {
  check(valid, eventId);
  const claim = await reserve();
  if (claim !== 'reserved') return { status: claim === 'too_soon' ? 'too_soon' : 'not_confirmed' };
  try {
    const event = await getEvent(eventId);
    if (!matches(event, valid, eventId) || !etag(event)) return { status: 'unknown' };
    const sequence = event.sequence === undefined ? 0 : event.sequence;
    if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence >= Number.MAX_SAFE_INTEGER)
      return { status: 'unknown' };
    try {
      await patchEvent(eventId, { sequence: sequence + 1 }, event.etag);
    } catch (error) {
      if (definite(error))
        return (await finish(finalize, 'failed'))
          ? { status: 'failed', message: 'Calendar rejected the resend.' }
          : { status: 'unknown' };
      return { status: 'unknown' };
    }
    const readback = await getEvent(eventId);
    if (!matches(readback, valid, eventId) || readback.sequence !== sequence + 1)
      return { status: 'unknown' };
    return (await finish(finalize, 'sent')) ? { status: 'sent' } : { status: 'unknown' };
  } catch {
    return { status: 'unknown' };
  }
}
