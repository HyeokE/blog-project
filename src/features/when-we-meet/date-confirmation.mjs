import { createHash } from 'node:crypto';
import { datesInRange, isCalendarDate, nextCalendarDate } from './date-availability.mjs';
import { confirmationEventId } from './confirmation-foundation.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const email = /^[^\s@\x00-\x1f\x7f]+@[^\s@.\x00-\x1f\x7f]+(?:\.[^\s@.\x00-\x1f\x7f]+)+$/;
const record = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const idValid = (value) => typeof value === 'string' && uuid.test(value);
const fail = () => {
  throw new Error('Invalid date confirmation snapshot');
};
const compareIds = (a, b) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);
const denseList = (value, validEntry) => {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index++) {
    if (!Object.hasOwn(value, index) || !validEntry(value[index])) return false;
  }
  return true;
};
const uniqueList = (value) => denseList(value, idValid) && new Set(value).size === value.length;
const instantKeys = ['start', 'end', 'dateTime', 'startTime', 'endTime', 'timeZone', 'interval'];

/** Caller supplies an authorized room/member snapshot. No availability, names or browser emails
 * authorize guests. Historical dates remain valid. Civil dates never become instants. */
export function validateDateConfirmation(proposal, room, members) {
  try {
    if (
      !record(proposal) ||
      !record(room) ||
      room.scheduleMode !== 'date' ||
      room.startTime !== null ||
      room.endTime !== null ||
      !idValid(room.id) ||
      proposal.roomId !== room.id
    )
      fail();
    if (typeof room.timezone !== 'string' || !room.timezone || /^[+-]/.test(room.timezone)) fail();
    // Validate IANA identity only; no formatting or Date/instant conversion.
    new Intl.DateTimeFormat('en', { timeZone: room.timezone });
    if (
      !isCalendarDate(proposal.date) ||
      !datesInRange(room.startDate, room.endDate).includes(proposal.date)
    )
      fail();
    if (instantKeys.some((key) => key in proposal)) fail();
    const endDate = nextCalendarDate(proposal.date);
    if (
      ('startDate' in proposal && proposal.startDate !== proposal.date) ||
      ('endDate' in proposal && proposal.endDate !== endDate)
    )
      fail();
    if (
      !Number.isSafeInteger(proposal.revision) ||
      proposal.revision < 1 ||
      typeof proposal.title !== 'string' ||
      /[\x00-\x1f\x7f-\x9f]/.test(proposal.title)
    )
      fail();
    const title = proposal.title.trim();
    if (
      !title ||
      title.length > 100 ||
      !denseList(members, (member) => record(member) && idValid(member.userId)) ||
      !members.length
    )
      fail();
    const memberIds = members.map((member) => {
      if (!record(member) || !idValid(member.userId)) fail();
      return member.userId;
    });
    const recipients = proposal.recipients;
    const excluded =
      proposal.excluded === undefined && !('excluded' in proposal) ? [] : proposal.excluded;
    const optional =
      proposal.optional === undefined && !('optional' in proposal) ? [] : proposal.optional;
    if (
      !uniqueList(memberIds) ||
      !uniqueList(recipients) ||
      !recipients.length ||
      !uniqueList(excluded) ||
      !uniqueList(optional)
    )
      fail();
    const partition = [...recipients, ...excluded];
    if (
      partition.length !== memberIds.length ||
      !uniqueList(partition) ||
      partition.some((id) => !memberIds.includes(id)) ||
      optional.some((id) => !recipients.includes(id))
    )
      fail();
    const selected = members
      .filter((member) => recipients.includes(member.userId))
      .map((member) => {
        const address = typeof member.email === 'string' ? member.email.trim() : '';
        if (!email.test(address)) fail();
        return Object.freeze({
          userId: member.userId,
          email: address,
          optional: optional.includes(member.userId),
        });
      })
      .sort(compareIds);
    if (new Set(selected.map((member) => member.email.toLowerCase())).size !== selected.length)
      fail();
    return Object.freeze({
      scheduleMode: 'date',
      roomId: room.id,
      date: proposal.date,
      startDate: proposal.date,
      endDate,
      timezone: room.timezone,
      title,
      revision: proposal.revision,
      recipients: Object.freeze(selected),
      excluded: Object.freeze([...excluded].sort()),
    });
  } catch {
    fail();
  }
}

/** Pure Google Events insert body: all-day date bounds and exclusive next-day end.
 * Official contract: https://developers.google.com/workspace/calendar/api/v3/reference/events
 * No event ID, OAuth, network caller or sendUpdates policy is attached here. */
export function buildDateCalendarInsert(valid) {
  return {
    summary: valid.title,
    start: { date: valid.startDate },
    end: { date: valid.endDate },
    attendees: valid.recipients.map(({ email, optional }) =>
      optional ? { email, optional: true } : { email },
    ),
    guestsCanSeeOtherGuests: false,
    guestsCanInviteOthers: false,
    guestsCanModify: false,
  };
}

/** Fixed-key canonical date-kind hash. Preserve trimmed email spelling (including case);
 * only roster ordering is normalized. No unrelated PII enters the hash. */
export function dateConfirmationFingerprint(valid) {
  const { scheduleMode, roomId, date, startDate, endDate, timezone, title, revision } = valid;
  const recipients = [...valid.recipients]
    .sort(compareIds)
    .map(({ userId, email, optional }) => ({ userId, email, optional }));
  return createHash('sha256')
    .update(
      JSON.stringify({
        scheduleMode,
        roomId,
        date,
        startDate,
        endDate,
        timezone,
        title,
        revision,
        recipients,
        excluded: [...valid.excluded].sort(),
      }),
    )
    .digest('hex');
}

// Room mode is immutable: reuse the existing per-room/revision namespace.
export const dateConfirmationEventId = confirmationEventId;

/** Conservative protected-field reconciliation, deliberately stricter than timed eventMatches.
 * Caller verifies the requested event ID separately (edits may retain the root ID).
 * Never omit organizer/self rows automatically: the exact selected guest set must be returned.
 * RSVP/displayName extras are irrelevant. Missing privacy flags are uncertain, not defaults.
 * Only absent/confirmed event status is accepted; malformed data returns false, never throws. */
export function matchesDateCalendarEvent(event, valid) {
  try {
    if (
      !record(event) ||
      !record(valid) ||
      valid.scheduleMode !== 'date' ||
      !isCalendarDate(valid.startDate) ||
      valid.date !== valid.startDate ||
      nextCalendarDate(valid.startDate) !== valid.endDate
    )
      return false;
    if (event.status !== undefined && event.status !== 'confirmed') return false;
    if (event.summary !== valid.title || event.attendeesOmitted === true) return false;
    for (const key of ['start', 'end']) {
      const bound = event[key];
      if (
        !record(bound) ||
        bound.date !== valid[key === 'start' ? 'startDate' : 'endDate'] ||
        'dateTime' in bound ||
        'timeZone' in bound
      )
        return false;
    }
    for (const key of ['guestsCanSeeOtherGuests', 'guestsCanInviteOthers', 'guestsCanModify'])
      if (event[key] !== false) return false;
    if (
      !Array.isArray(event.attendees) ||
      !Array.isArray(valid.recipients) ||
      !valid.recipients.length ||
      event.attendees.length !== valid.recipients.length
    )
      return false;
    const wanted = new Map();
    for (const recipient of valid.recipients) {
      if (
        !record(recipient) ||
        typeof recipient.email !== 'string' ||
        !email.test(recipient.email) ||
        typeof recipient.optional !== 'boolean'
      )
        return false;
      const address = recipient.email.toLowerCase();
      if (wanted.has(address)) return false;
      wanted.set(address, recipient.optional);
    }
    const seen = new Set();
    for (const attendee of event.attendees) {
      if (
        !record(attendee) ||
        typeof attendee.email !== 'string' ||
        !email.test(attendee.email) ||
        (attendee.optional !== undefined && typeof attendee.optional !== 'boolean')
      )
        return false;
      const address = attendee.email.toLowerCase();
      if (
        seen.has(address) ||
        !wanted.has(address) ||
        wanted.get(address) !== (attendee.optional === true)
      )
        return false;
      seen.add(address);
    }
    return true;
  } catch {
    return false;
  }
}
