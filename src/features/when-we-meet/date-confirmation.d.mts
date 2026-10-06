/** Authorized snapshots are a caller responsibility; these inputs grant no authority. */
export interface DateConfirmationRoom {
  id: string;
  scheduleMode: 'date';
  startDate: string;
  endDate: string;
  startTime: null;
  endTime: null;
  timezone: string;
}
export interface DateConfirmationMember {
  userId: string;
  email: string | null;
}
export interface DateConfirmationProposal {
  roomId: string;
  date: string;
  title: string;
  revision: number;
  recipients: readonly string[];
  excluded?: readonly string[];
  optional?: readonly string[];
  startDate?: string;
  endDate?: string;
  start?: never;
  end?: never;
  dateTime?: never;
  startTime?: never;
  endTime?: never;
  timeZone?: never;
  interval?: never;
}
export interface ValidDateConfirmation {
  readonly scheduleMode: 'date';
  readonly roomId: string;
  readonly date: string;
  readonly startDate: string;
  /** Exclusive next civil day (0001..9999); no timezone conversion. */
  readonly endDate: string;
  readonly timezone: string;
  readonly title: string;
  readonly revision: number;
  readonly recipients: readonly Readonly<{ userId: string; email: string; optional: boolean }>[];
  readonly excluded: readonly string[];
}
export interface DateCalendarInsert {
  summary: string;
  start: { date: string; dateTime?: never; timeZone?: never };
  end: { date: string; dateTime?: never; timeZone?: never };
  attendees: { email: string; optional?: true }[];
  guestsCanSeeOtherGuests: false;
  guestsCanInviteOthers: false;
  guestsCanModify: false;
}
/** Public untrusted inputs fail closed with a generic Error; output is deeply frozen. */
export function validateDateConfirmation(
  proposal: unknown,
  room: unknown,
  members: unknown,
): ValidDateConfirmation;
/** Requires a validated snapshot. Pure payload only; no ID or notification policy. */
export function buildDateCalendarInsert(valid: ValidDateConfirmation): DateCalendarInsert;
/** Fixed-key SHA256; order insensitive, email spelling preserved, no unrelated PII. */
export function dateConfirmationFingerprint(valid: ValidDateConfirmation): string;
export function dateConfirmationEventId(roomId: string, revision: number): string;
/** Unknown/malformed readback returns false. Exact guest set (no organizer exemption),
 * title, civil bounds, optional flags and explicit false privacy flags required.
 * Caller verifies event ID separately; RSVP/displayName extras are ignored. */
export function matchesDateCalendarEvent(event: unknown, valid: ValidDateConfirmation): boolean;
