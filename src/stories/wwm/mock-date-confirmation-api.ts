// Local date-confirmation fixture. No Calendar client, mail client or transport.
import { ApiError } from './mock-api';
import { dateState, assertDateRoom, fixtureOutcome, OWNER } from './mock-date-api';
import { nextCalendarDate } from '@/features/when-we-meet/date-availability.mjs';
import { buildDateProposal } from '@/features/when-we-meet/date-confirm-ui.mjs';
import type {
  DateConfirmationInput,
  DateConfirmationResult,
  DateConfirmationStatus,
} from '@/features/when-we-meet/date-confirmation-api';
import type {
  DateConfirmationOwner,
  StoredDateConfirmation,
} from '@/features/when-we-meet/date-confirmation-persistence.mjs';
import type { ValidDateConfirmation } from '@/features/when-we-meet/date-confirmation.mjs';
export { ApiError };
export type { DateConfirmationInput, DateConfirmationResult, DateConfirmationStatus };
type Attendee = {
  userId: string;
  displayName: string;
  email: string | null;
  hasAvailability: boolean;
};
type Payload = {
  status: DateConfirmationStatus | null;
  owner: DateConfirmationOwner | null;
  review: { attendees: Attendee[] } | null;
};
type Mode = 'success' | 'failure' | 'pending';
type Send = 'confirmed' | 'failure' | 'pending' | 'reconciling';
export const confirmationState = {
  status: null,
  owner: null,
  review: { attendees: [] } as Payload['review'],
  load: 'success' as Mode,
  send: 'confirmed' as Send,
  update: 'confirmed' as Send,
  resend: 'success' as Mode,
  posts: [] as Array<{ operation: 'initial' | 'update'; input: DateConfirmationInput }>,
  resends: 0,
  checks: 0,
  generation: 0,
  unresolved: null as { operation: 'initial' | 'update'; valid: ValidDateConfirmation } | null,
} as Payload & {
  load: Mode;
  send: Send;
  update: Send;
  resend: Mode;
  posts: Array<{ operation: 'initial' | 'update'; input: DateConfirmationInput }>;
  resends: number;
  checks: number;
  generation: number;
  unresolved: { operation: 'initial' | 'update'; valid: ValidDateConfirmation } | null;
};
const clone = <T>(value: T): T => structuredClone(value);
// normalizeDateReview requires a Google-shaped URL for confirmed records.
// This inert synthetic path is never opened: preview prevents all link navigation.
const fixtureUrl = 'https://www.google.com/calendar/storybook-disabled';
export function resetDateConfirmationMock() {
  Object.assign(confirmationState, {
    status: null,
    owner: null,
    review: {
      attendees:
        dateState.room.role === 'ADMIN'
          ? [
              ...[
                '11111111-1111-4111-8111-111111111111',
                '33333333-3333-4333-8333-333333333333',
                '44444444-4444-4444-8444-444444444444',
              ],
            ].map((userId, index) => ({
              userId,
              displayName: ['Alex Sample', 'Morgan Sample', 'Taylor Sample'][index],
              email: ['alex@example.invalid', 'morgan@example.invalid', 'taylor@example.invalid'][
                index
              ],
              hasAvailability: Boolean(
                dateState.responses.find((r) => r.userId === userId)?.availableDates.length,
              ),
            }))
          : [],
    },
    load: 'success',
    send: 'confirmed',
    update: 'confirmed',
    resend: 'success',
    posts: [],
    resends: 0,
    checks: 0,
    unresolved: null,
    generation: confirmationState.generation + 1,
  });
}
function ownerOnly(roomId: string) {
  assertDateRoom(roomId);
  if (dateState.room.role !== 'ADMIN' || dateState.room.ownerId !== OWNER) {
    throw new ApiError('Synthetic owner required.', 403);
  }
}
function status(
  valid: ValidDateConfirmation,
  state: 'confirmed' | 'reconciling',
): DateConfirmationStatus {
  return {
    revision: valid.revision,
    status: state,
    scheduleMode: 'date',
    title: valid.title,
    startDate: valid.startDate,
    endDate: valid.endDate,
    timezone: valid.timezone,
    url: state === 'confirmed' ? fixtureUrl : null,
  };
}
function snapshot(
  valid: ValidDateConfirmation,
  state: 'confirmed' | 'reconciling',
): StoredDateConfirmation {
  return {
    valid: clone(valid),
    status: state,
    payloadHash: '0'.repeat(64),
    url: state === 'confirmed' ? fixtureUrl : null,
  };
}
function saveConfirmed(valid: ValidDateConfirmation) {
  const stored = snapshot(valid, 'confirmed');
  const previous = confirmationState.owner?.revisions || [];
  confirmationState.owner = {
    root: {
      ...stored,
      eventId: 'storybook-local-event',
      organizerId: OWNER,
      organizerEmail: 'alex@example.invalid',
    },
    revisions: [
      ...previous,
      { ...stored, baseRevision: valid.revision === 1 ? null : valid.revision - 1 },
    ],
    pending: null,
  };
  confirmationState.status = status(valid, 'confirmed');
  confirmationState.unresolved = null;
  return { status: 'confirmed' as const, url: fixtureUrl };
}
function proposal(input: DateConfirmationInput): ValidDateConfirmation {
  const attendees = confirmationState.review?.attendees || [];
  const body = buildDateProposal(dateState.room, attendees, {
    date: input.date,
    title: input.title,
    revision: input.revision,
    recipients: [...input.recipients],
    optional: [...(input.optional || [])],
  });
  const excluded = [...(body.excluded || [])],
    optional = [...(body.optional || [])];
  if (
    JSON.stringify([...(input.excluded || [])].sort()) !== JSON.stringify([...excluded].sort()) ||
    input.revision !== (confirmationState.owner?.root.valid.revision || 0) + 1
  ) {
    throw new ApiError('Synthetic review changed.', 409);
  }
  return {
    scheduleMode: 'date',
    roomId: dateState.room.id,
    date: body.date,
    startDate: body.date,
    endDate: nextCalendarDate(body.date),
    timezone: dateState.room.timezone,
    title: body.title,
    revision: body.revision,
    excluded,
    recipients: body.recipients.map((userId) => {
      const person = attendees.find((p) => p.userId === userId);
      if (!person?.email) {
        throw new ApiError('Synthetic recipient required.', 400);
      }
      return { userId, email: person.email, optional: optional.includes(userId) };
    }),
  };
}
export async function getDateConfirmation(roomId: string, signal?: AbortSignal): Promise<Payload> {
  assertDateRoom(roomId);
  const generation = confirmationState.generation;
  await fixtureOutcome(confirmationState.load, signal);
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  if (generation !== confirmationState.generation) {
    throw new ApiError('Fixture reset.', 409);
  }
  if (dateState.room.role !== 'ADMIN') {
    return clone({ status: confirmationState.status, owner: null, review: null });
  }
  return clone({
    status: confirmationState.status,
    owner: confirmationState.owner,
    review: confirmationState.review,
  });
}
async function send(
  roomId: string,
  input: DateConfirmationInput,
  operation: 'initial' | 'update',
): Promise<DateConfirmationResult> {
  ownerOnly(roomId);
  if ((operation === 'initial') !== !confirmationState.owner || confirmationState.unresolved) {
    throw new ApiError('Synthetic confirmation state changed.', 409);
  }
  const valid = proposal(input),
    mode = operation === 'initial' ? confirmationState.send : confirmationState.update,
    generation = confirmationState.generation;
  await fixtureOutcome(mode === 'pending' ? 'pending' : 'success');
  if (generation !== confirmationState.generation) {
    throw new ApiError('Fixture reset.', 409);
  }
  confirmationState.posts.push({ operation, input: clone(input) });
  if (mode === 'failure') {
    return { status: 'failed', message: 'Synthetic send failed; no invitations were sent.' };
  }
  if (mode === 'reconciling') {
    confirmationState.unresolved = { operation, valid };
    if (operation === 'initial') {
      confirmationState.status = status(valid, 'reconciling');
    } else if (confirmationState.owner) {
      const previous = confirmationState.owner.root.valid;
      confirmationState.owner = {
        ...confirmationState.owner,
        pending: {
          ...snapshot(valid, 'reconciling'),
          baseRevision: previous.revision,
          previous: clone(previous),
        },
      };
    }
    return { status: 'reconciling' };
  }
  return saveConfirmed(valid);
}
export function confirmDateMeetingRoute(roomId: string, input: DateConfirmationInput) {
  return send(roomId, input, 'initial');
}
export function updateDateMeetingRoute(roomId: string, input: DateConfirmationInput) {
  return send(roomId, input, 'update');
}
export async function reconcileDateMeetingRoute(
  roomId: string,
  operation: 'initial' | 'update' = 'initial',
): Promise<DateConfirmationResult> {
  ownerOnly(roomId);
  confirmationState.checks++;
  const unresolved = confirmationState.unresolved;
  if (!unresolved) {
    return {
      status: confirmationState.status?.status === 'confirmed' ? 'confirmed' : 'not_confirmed',
    };
  }
  if (unresolved.operation !== operation) {
    return { status: 'conflict' };
  }
  return saveConfirmed(unresolved.valid);
}
export async function resendDateMeetingRoute(roomId: string): Promise<DateConfirmationResult> {
  ownerOnly(roomId);
  if (confirmationState.status?.status !== 'confirmed' || confirmationState.unresolved) {
    throw new ApiError('Synthetic confirmed meeting required.', 409);
  }
  const generation = confirmationState.generation;
  await fixtureOutcome(confirmationState.resend);
  if (generation !== confirmationState.generation) {
    throw new ApiError('Fixture reset.', 409);
  }
  confirmationState.resends++;
  return { status: 'sent' };
}
resetDateConfirmationMock();
