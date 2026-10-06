/** ISO civil date, proleptic Gregorian years 0001..9999; validated at runtime, not an instant. */
export type CalendarDate = string;
export interface DateAvailabilityRoom {
 readonly startDate: CalendarDate;
 readonly endDate: CalendarDate;
}
/** Structural subset of the real PeoplePanel Person contract; authorization belongs to caller. */
export interface DateAvailabilityPerson {
 readonly userId: string;
}
/** Persisted response only. Do not pass the current user's unsaved draft. */
export interface SavedDateAvailabilityResponse {
 readonly userId: string;
 readonly displayName: string;
 readonly availableDates: readonly CalendarDate[];
}
export interface AggregatedDateAvailabilityDay {
 date: CalendarDate;
 availableUserIds: string[];
 unavailableUserIds: string[] | null;
 nonrespondentUserIds: string[] | null;
}
export interface AggregatedDateAvailability {
 totalMembers: number | null;
 dates: AggregatedDateAvailabilityDay[];
}
/** Strict real YYYY-MM-DD, years 0001..9999; false for all other inputs. */
export declare function isCalendarDate(value: unknown): value is CalendarDate;
/** Next civil day / exclusive all-day end; RangeError for invalid input or year overflow. */
export declare function nextCalendarDate(date: CalendarDate): CalendarDate;
/** Sorted inclusive range, 1..MAX_RANGE_DAYS (28); RangeError on invalid/reverse/oversize. */
export declare function datesInRange(startDate: CalendarDate, endDate: CalendarDate): CalendarDate[];
/** Fresh unique sorted dates. Reject malformed arrays/dates, invalid room and out-of-range values. */
export declare function normalizeAvailableDates(values: readonly CalendarDate[], room: DateAvailabilityRoom): CalendarDate[];
/** Baseline→desired deltas applied to current; no name merging, no mutation.
 * Validates civil dates only. Caller must normalizeAvailableDates against room before/after merge.
 */
export declare function mergeAvailableDateChanges(base: readonly CalendarDate[], desired: readonly CalendarDate[], current: readonly CalendarDate[]): CalendarDate[];
/** Authorized roster userIds determine membership; foreign responses excluded after validation.
 * Duplicate response IDs throw TypeError regardless of updatedAt. Duplicate roster IDs deduplicate.
 * Empty/missing selection => nonrespondent, another date only => unavailable for this date.
 * people=null means unknown total/unavailable/nonrespondent (null), observed available IDs only;
 * caller must authorize saved responses upstream when membership cannot be checked.
 * people=[] means known zero. Names and hasAvailability never determine identity/status.
 * Returns sorted dates and IDs without mutating input. Invalid data throws TypeError/RangeError.
 */
export declare function aggregateDateAvailability(room: DateAvailabilityRoom, responses: readonly SavedDateAvailabilityResponse[], people: readonly DateAvailabilityPerson[] | null): AggregatedDateAvailability;
