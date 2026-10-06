import type { DateRoom } from './date-contracts';
import type { DateConfirmationStatus, DateConfirmationInput } from './date-confirmation-api';
import type { DateConfirmationOwner } from './date-confirmation-persistence.mjs';
export type DateReviewAttendee = {
  userId: string;
  displayName: string;
  email: string | null;
  hasAvailability: boolean;
};
export type DateReview = {
  status: DateConfirmationStatus | null;
  owner: DateConfirmationOwner | null;
  review: { attendees: DateReviewAttendee[] } | null;
};
export function saveDateConfirmReturn(
  storage: Pick<Storage, 'setItem'>,
  roomId: string,
  userId: string,
  now?: number,
): void;
export function consumeDateConfirmReturn(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
  roomId: string,
  userId: string,
  search: string,
  now?: number,
): boolean;
export function eligibleDateEmail(value: unknown): boolean;
export function normalizeDatePeople(
  value: unknown,
): { userId: string; displayName: string; isAdmin: boolean; hasAvailability: boolean }[];
export function normalizeDateReview(value: unknown, room: DateRoom, userId: string): DateReview;
export function buildDateProposal(
  room: DateRoom,
  attendees: DateReviewAttendee[],
  draft: {
    date: string;
    title: string;
    revision: number;
    recipients: string[];
    optional: string[];
  },
): DateConfirmationInput;
