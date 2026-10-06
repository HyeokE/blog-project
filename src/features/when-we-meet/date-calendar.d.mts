import type { DateResponseBaseline, DateRoomSchedule } from './date-contracts';
export function toLocalDate(value: string): Date;
export function fromLocalDate(value: Date): string;
export function rebaseDateDraft(
  base: DateResponseBaseline,
  desired: DateResponseBaseline,
  current: DateResponseBaseline,
): DateResponseBaseline;
export function constrainDateDraft(
  value: DateResponseBaseline,
  room: DateRoomSchedule,
): { value: DateResponseBaseline; removed: boolean };
