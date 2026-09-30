/** Longest meeting window in days (inclusive). Must match the wwm_date_span check in the database. */
export const MAX_RANGE_DAYS=28;
/** Most half-hour slots one response can hold: every slot of a full-day, MAX_RANGE_DAYS-long meeting. */
export const MAX_RESPONSE_SLOTS=MAX_RANGE_DAYS*48;
