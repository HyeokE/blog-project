import type { ValidDateConfirmation, DateCalendarInsert } from './date-confirmation.mjs';

/** Server adapter responsibility: authenticated owner, persisted claim/hash/revision/root ID,
 * frozen recipient snapshot, and civil/schema/hash validation of stored snapshots. Do NOT
 * revalidate stored dates against current room range/timezone/roster. No client input grants
 * authority. New proposals use validateDateConfirmation before entering this service.
 * Example: confirmDateMeeting({valid, eventId: persistedRootId, reserve: reserveBoundClaim,
 * getEvent: readCalendar, insertEvent: insertCalendar, finalize: finalizeBoundClaim}).
 * Adapters must use sendUpdates=all and map patch's etag to If-Match. getEvent returns null
 * only for definite 404/410 absence; transport failures throw. finalize returns the ACTUAL
 * durable status (never merely echo its requested argument). No adapter is supplied here.
 */
export interface DateFlowCalendarEvent {
  id?: string;
  htmlLink?: string;
  etag?: string;
  sequence?: number;
  [key: string]: unknown;
}
export type DateMeetingResult =
  | { status: 'confirmed'; url: string | undefined }
  | { status: 'conflict' | 'not_confirmed' | 'reconciling' }
  | { status: 'failed'; message: string };
export type DateResendResult =
  | { status: 'sent' | 'too_soon' | 'not_confirmed' | 'unknown' }
  | { status: 'failed'; message: string };
export type DateFlowClaim =
  | 'reserved'
  | 'reserved_reconcile_required'
  | 'reconcile'
  | 'existing'
  | 'conflict'
  | 'not_confirmed'
  | 'too_soon';
export type DateFlowFinalStatus =
  'confirmed' | 'reconciling' | 'released' | 'reverted' | 'sent' | 'failed';
export type DateCalendarEditPatch = DateCalendarInsert & {
  attendees: { email: string; optional?: true; responseStatus?: string }[];
  id?: never;
};
/** Invalid flow inputs and reserve failures reject; Calendar/finalize failures fail closed.
 * Google error-like throws are definite only with definite:true and integer 4xx status,
 * excluding ambiguous 408/409/429. Returned messages never copy transport error text.
 */
export interface DateFlowBase {
  valid: ValidDateConfirmation;
  /** Stable persisted root event ID, lowercase Google base32hex, length 5..1024. */
  eventId: string;
  reserve: () => Promise<DateFlowClaim>;
  getEvent: (eventId: string) => Promise<DateFlowCalendarEvent | null>;
  finalize: (status: DateFlowFinalStatus, url?: string) => Promise<string | null | undefined>;
}
export interface ConfirmDateMeetingParams extends DateFlowBase {
  insertEvent: (body: DateCalendarInsert & { id: string }) => Promise<unknown>;
}
export interface EditDateMeetingParams extends DateFlowBase {
  /** Trusted persisted revision; valid must be the next revision of the same room. */
  previous: ValidDateConfirmation;
  patchEvent: (eventId: string, body: DateCalendarEditPatch, etag: string) => Promise<unknown>;
}
export interface ResendDateMeetingParams extends DateFlowBase {
  patchEvent: (eventId: string, body: { sequence: number }, etag: string) => Promise<unknown>;
}
export function confirmDateMeeting(params: ConfirmDateMeetingParams): Promise<DateMeetingResult>;
export function editDateMeeting(params: EditDateMeetingParams): Promise<DateMeetingResult>;
export function resendDateMeeting(params: ResendDateMeetingParams): Promise<DateResendResult>;
