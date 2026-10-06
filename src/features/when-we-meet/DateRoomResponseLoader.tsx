'use client';
import { use, useEffect, useRef } from 'react';
import type { DateResponse } from './date-contracts';
export type DateRoomResponseResult =
  { responses: DateResponse[]; error?: never } | { error: string; responses?: never };
export function DateRoomResponseLoader({
  result,
  onReady,
}: {
  result: Promise<DateRoomResponseResult>;
  onReady: (value: DateRoomResponseResult) => void;
}) {
  const value = use(result),
    received = useRef(false);
  useEffect(() => {
    if (!received.current) {
      received.current = true;
      onReady(value);
    }
  }, [value, onReady]);
  return null;
}
