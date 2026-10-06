// Storybook-only date transport. All writes are bounded to one synthetic room.
import { state, calendar, ApiError, bumpDateResetEpoch } from './mock-api';
import {
  datesInRange,
  nextCalendarDate,
  normalizeAvailableDates,
  mergeAvailableDateChanges,
} from '@/features/when-we-meet/date-availability.mjs';
import { todayInTimezone } from '@/features/when-we-meet/creation-validation.mjs';
import type {
  CreateDateRoomInput,
  DateResponseBaseline,
  DateRoomResult,
  DateRoomSchedule,
  DateSaveResult,
  DateScheduleResult,
} from '@/features/when-we-meet/date-contracts';
export { ApiError };
export type * from '@/features/when-we-meet/date-contracts';
export const DATE_ROOM_ID = '66666666-6666-4666-8666-666666666666';
export const OWNER = '11111111-1111-4111-8111-111111111111';
export const MORGAN = '33333333-3333-4333-8333-333333333333';
export const TAYLOR = '44444444-4444-4444-8444-444444444444';
export const DATE_INVITE_TOKEN = '77777777-7777-4777-8777-777777777777';
type Mode = 'success' | 'failure' | 'pending';
type DateState = DateRoomResult & {
  load: Mode;
  save: Mode;
  create: Mode;
  schedule: Mode;
  serial: number;
  generation: number;
  creates: CreateDateRoomInput[];
  saves: unknown[];
  schedules: DateRoomSchedule[];
};
export const dateState = {} as DateState;
const clone = <T>(value: T): T => structuredClone(value);
export function assertDateRoom(roomId: string) {
  if (roomId !== DATE_ROOM_ID) {
    throw new ApiError('Synthetic date room required.', 404);
  }
}
export function syncDatePeople() {
  const names = new Map([
    [OWNER, 'Alex Sample'],
    [MORGAN, 'Morgan Sample'],
    [TAYLOR, 'Taylor Sample'],
  ]);
  state.people = [OWNER, MORGAN, TAYLOR].map((userId) => ({
    userId,
    displayName:
      dateState.responses.find((r) => r.userId === userId)?.displayName ||
      names.get(userId) ||
      'Synthetic member',
    isAdmin: userId === dateState.room.ownerId,
    hasAvailability: Boolean(
      dateState.responses.find((r) => r.userId === userId)?.availableDates.length,
    ),
  }));
  state.peopleFailure = false;
}
export function resetDateMock({
  member = false,
  longRange = false,
}: { member?: boolean; longRange?: boolean } = {}) {
  const startDate = longRange ? '2026-10-25' : '2026-10-30',
    endDate = longRange ? '2026-11-21' : '2026-11-01';
  bumpDateResetEpoch();
  Object.assign(dateState, {
    room: {
      id: DATE_ROOM_ID,
      title: 'Autumn planning day',
      ownerId: member ? MORGAN : OWNER,
      role: member ? 'MEMBER' : 'ADMIN',
      scheduleMode: 'date',
      startDate,
      endDate,
      timezone: 'Asia/Seoul',
      startTime: null,
      endTime: null,
      inviteToken: '77777777-7777-4777-8777-777777777777',
    },
    userId: OWNER,
    responses: [
      {
        userId: OWNER,
        displayName: 'Alex Sample',
        availableDates: [startDate, nextCalendarDate(startDate)],
        updatedAt: '2026-10-07T00:00:00.123456Z',
      },
      {
        userId: MORGAN,
        displayName: 'Morgan Sample',
        availableDates: [startDate, endDate],
        updatedAt: '2026-10-07T00:00:00.654321Z',
      },
    ],
    load: 'success',
    save: 'success',
    create: 'success',
    schedule: 'success',
    serial: 0,
    generation: (dateState.generation || 0) + 1,
    creates: [],
    saves: [],
    schedules: [],
  });
  syncDatePeople();
  calendar.rename = 'success';
}
export function fixtureOutcome(mode: Mode, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'));
  }
  if (mode === 'failure') {
    return Promise.reject(new ApiError('Synthetic date request failed. Retry to continue.', 502));
  }
  if (mode === 'pending') {
    return new Promise((_resolve, reject) =>
      signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
        once: true,
      }),
    );
  }
  return Promise.resolve();
}
function nameValue(name: string) {
  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > 50 ||
    /[\u0000-\u001f\u007f]/.test(name)
  ) {
    throw new ApiError('Enter a valid synthetic name.', 400);
  }
  return name.trim();
}
function scheduleValue(schedule: DateRoomSchedule) {
  datesInRange(schedule.startDate, schedule.endDate);
  if (!todayInTimezone(schedule.timezone)) {
    throw new ApiError('Choose a valid timezone.', 400);
  }
  return { startDate: schedule.startDate, endDate: schedule.endDate, timezone: schedule.timezone };
}
function version() {
  return `2026-10-07T00:00:00.${String(123456 + ++dateState.serial).padStart(6, '0')}Z`;
}
export function futureDateDraft(clock = new Date()) {
  const timezone = 'Asia/Seoul',
    today = todayInTimezone(timezone, clock);
  if (!today) {
    throw new Error('Invalid fixture clock.');
  }
  const startDate = nextCalendarDate(today),
    endDate = nextCalendarDate(nextCalendarDate(startDate));
  return {
    form: {
      scheduleMode: 'date' as const,
      title: 'Autumn planning day',
      startDate,
      endDate,
      startTime: '00:00',
      endTime: '24:00',
      timezone,
    },
    name: 'Alex Sample',
  };
}
export async function checkDateModeCapability() {
  return { supported: true as const };
}
export async function createDateRoom(input: CreateDateRoomInput, clock = new Date()) {
  if (input.scheduleMode !== 'date' || !input.title?.trim() || input.title.trim().length > 100) {
    throw new ApiError('Invalid synthetic date meeting.', 400);
  }
  nameValue(input.name);
  const schedule = scheduleValue(input);
  if (schedule.startDate < (todayInTimezone(schedule.timezone, clock) || '')) {
    throw new ApiError('Choose future dates.', 400);
  }
  const generation = dateState.generation;
  await fixtureOutcome(dateState.create);
  if (generation !== dateState.generation) {
    throw new ApiError('Fixture reset.', 409);
  }
  dateState.creates.push(clone(input));
  dateState.room = { ...dateState.room, ...schedule, title: input.title.trim() };
  dateState.responses = [
    { userId: OWNER, displayName: input.name.trim(), availableDates: [], updatedAt: version() },
  ];
  syncDatePeople();
  return { id: DATE_ROOM_ID, inviteToken: DATE_INVITE_TOKEN };
}
export async function loadDateRoom(roomId: string, signal?: AbortSignal): Promise<DateRoomResult> {
  assertDateRoom(roomId);
  const generation = dateState.generation;
  await fixtureOutcome(dateState.load, signal);
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  if (generation !== dateState.generation) {
    throw new ApiError('Fixture reset.', 409);
  }
  return clone({ room: dateState.room, responses: dateState.responses, userId: dateState.userId });
}
export async function saveDateResponse(
  roomId: string,
  name: string,
  availableDates: string[],
  baseline: DateResponseBaseline,
): Promise<DateSaveResult> {
  assertDateRoom(roomId);
  const nextName = nameValue(name),
    generation = dateState.generation;
  const before = normalizeAvailableDates(baseline.availableDates, dateState.room),
    desired = normalizeAvailableDates(availableDates, dateState.room);
  await fixtureOutcome(dateState.save);
  if (generation !== dateState.generation) {
    throw new ApiError('Fixture reset.', 409);
  }
  const own = dateState.responses.find((r) => r.userId === dateState.userId);
  if (!own) {
    throw new ApiError('Synthetic response required.', 403);
  }
  const value = {
    name: nextName === baseline.name.trim() ? own.displayName : nextName,
    availableDates: normalizeAvailableDates(
      mergeAvailableDateChanges(before, desired, own.availableDates),
      dateState.room,
    ),
    version: version(),
  };
  own.displayName = value.name;
  own.availableDates = [...value.availableDates];
  own.updatedAt = value.version;
  dateState.saves.push(clone({ name, availableDates, baseline }));
  syncDatePeople();
  return { saved: true, value: clone(value) };
}
export async function updateDateRoomSchedule(
  roomId: string,
  schedule: DateRoomSchedule,
): Promise<DateScheduleResult> {
  assertDateRoom(roomId);
  if (dateState.room.role !== 'ADMIN' || dateState.room.ownerId !== dateState.userId) {
    throw new ApiError('Only the synthetic owner can change dates.', 403);
  }
  const next = scheduleValue(schedule),
    generation = dateState.generation;
  await fixtureOutcome(dateState.schedule);
  if (generation !== dateState.generation) {
    throw new ApiError('Fixture reset.', 409);
  }
  let removedDates = 0;
  dateState.room = { ...dateState.room, ...next };
  dateState.responses = dateState.responses.map((r) => {
    const availableDates = r.availableDates.filter((d) => d >= next.startDate && d <= next.endDate);
    removedDates += r.availableDates.length - availableDates.length;
    return { ...r, availableDates, updatedAt: version() };
  });
  dateState.schedules.push(clone(next));
  syncDatePeople();
  return { schedule: clone(next), removedDates };
}
resetDateMock();
