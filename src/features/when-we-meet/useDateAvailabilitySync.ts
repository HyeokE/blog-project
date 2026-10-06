'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { saveDateResponse } from './date-api';
import type { DateResponseBaseline, DateRoomSchedule } from './date-contracts';
import { isCalendarDate } from './date-availability.mjs';
import { rawDateVersion } from './date-normalize.mjs';
import { rebaseDateDraft, constrainDateDraft } from './date-calendar.mjs';
export type DateResponseSaveResult =
  | { ok: true; value: DateResponseBaseline }
  | { ok: false; reason: 'busy' | 'notReady' | 'rangeChanged' | 'failed' | 'superseded' };
const validName = (name: unknown): name is string =>
  typeof name === 'string' &&
  name.trim().length > 0 &&
  name.trim().length <= 50 &&
  !/[\u0000-\u001f\u007f]/.test(name);
const equal = (a: DateResponseBaseline | null, b: DateResponseBaseline | null) =>
  JSON.stringify(a) === JSON.stringify(b);
export type DateAvailabilitySyncOptions = {
  /** Gates new save/rename writes; false or throw returns busy without editing the draft. */
  canMutate?: () => boolean;
  /** Additional timer-only gate. Change permission reactively via a render (no polling). */
  canAutosave?: () => boolean;
};
const permits = (check: (() => boolean) | undefined): boolean => {
  try {
    return check === undefined || check() === true;
  } catch {
    return false;
  }
};
export function useDateAvailabilitySync(
  roomId: string,
  userId: string,
  room: DateRoomSchedule,
  options?: DateAvailabilitySyncOptions,
) {
  // Update during render: retained callbacks/timers must not borrow permission
  // from a render preceding auth loading or a settings mutation.
  const latestOptions = useRef(options);
  latestOptions.current = options;
  const autosaveAllowed = permits(options?.canMutate) && permits(options?.canAutosave);
  const permission = useRef({ allowed: autosaveAllowed, generation: 0 });
  if (permission.current.allowed !== autosaveAllowed) {
    permission.current = {
      allowed: autosaveAllowed,
      generation: permission.current.generation + 1,
    };
  }
  const autosaveGeneration = permission.current.generation;
  const [draft, setDraft] = useState<DateResponseBaseline | null>(null);
  const [baseline, setBaseline] = useState<DateResponseBaseline | null>(null);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState(false),
    [rangeChanged, setRangeChanged] = useState(false);
  const live = useRef<{
    base: DateResponseBaseline | null;
    draft: DateResponseBaseline | null;
    pending: boolean;
    expected: DateResponseBaseline | null;
    active: boolean;
    epoch: number;
  }>({ base: null, draft: null, pending: false, expected: null, active: true, epoch: 0 });
  const scope = useRef({ roomId, userId });
  const identity = useRef({ roomId, userId });
  identity.current = { roomId, userId };
  const rangeBlocked = useRef(false);
  const latestRoom = useRef(room);
  const renderedRoom = useRef(room);
  if (renderedRoom.current !== room) {
    renderedRoom.current = room;
    latestRoom.current = room;
  }
  useEffect(() => {
    const current = live.current;
    current.active = true;
    scope.current = { roomId, userId };
    latestRoom.current = renderedRoom.current;
    setSaving(false);
    setError(false);
    rangeBlocked.current = false;
    setRangeChanged(false);
    setDraft(null);
    setBaseline(null);
    return () => {
      current.active = false;
      current.epoch++;
      current.pending = false;
      current.expected = null;
      current.base = null;
      current.draft = null;
    };
  }, [roomId, userId]);
  const receive = useCallback(
    (current: DateResponseBaseline, schedule: DateRoomSchedule = latestRoom.current) => {
      const state = live.current;
      if (!state.active) {
        return;
      }
      latestRoom.current = schedule;
      const bounded = constrainDateDraft(current, schedule).value;
      if (state.base && state.expected) {
        // Move the in-flight reference with receives so subsequent local edits
        // to a remote addition or rename remain explicit post-dispatch deltas.
        const received = rebaseDateDraft(state.base, state.expected, bounded);
        state.expected = constrainDateDraft(received, schedule).value;
      }
      const next =
        state.base && state.draft ? rebaseDateDraft(state.base, state.draft, bounded) : bounded;
      const constrained = constrainDateDraft(next, schedule);
      state.base = bounded;
      state.draft = constrained.value;
      setBaseline(bounded);
      setDraft(constrained.value);
      if (constrained.removed) {
        rangeBlocked.current = true;
        setRangeChanged(true);
      }
    },
    [],
  );
  const edit = useCallback((value: DateResponseBaseline) => {
    const state = live.current;
    if (!state.active || !state.base) {
      return;
    }
    const constrained = constrainDateDraft(value, latestRoom.current);
    state.draft = constrained.value;
    setDraft(constrained.value);
    setError(false);
  }, []);
  const guard = useCallback((): DateResponseSaveResult | null => {
    const state = live.current;
    if (identity.current.roomId !== roomId || identity.current.userId !== userId) {
      return { ok: false, reason: 'superseded' };
    }
    if (
      scope.current.roomId !== roomId ||
      scope.current.userId !== userId ||
      !state.active ||
      !state.base ||
      !state.draft
    ) {
      return { ok: false, reason: 'notReady' };
    }
    // External blocking is transient busy, not a failed save. Do this before
    // any draft constraint/rename mutation; ACK handling remains independent.
    if (!permits(latestOptions.current?.canMutate) || state.pending) {
      return { ok: false, reason: 'busy' };
    }
    const constrained = constrainDateDraft(state.draft, latestRoom.current);
    if (constrained.removed) {
      state.draft = constrained.value;
      setDraft(constrained.value);
      rangeBlocked.current = true;
      setRangeChanged(true);
    }
    if (rangeBlocked.current) {
      return { ok: false, reason: 'rangeChanged' };
    }
    return null;
  }, [roomId, userId]);
  // Private shared preparation path: evaluate permission once, then stage the
  // rename and acquire pending synchronously before the first await.
  const executeRenameOrSave = useCallback(
    async (name?: string): Promise<DateResponseSaveResult> => {
      const blocked = guard();
      if (blocked) {
        return blocked;
      }
      const state = live.current;
      if (!state.draft || !state.base) {
        return { ok: false, reason: 'notReady' };
      }
      if (name !== undefined) {
        if (!validName(name)) {
          return { ok: false, reason: 'failed' };
        }
        state.draft = { ...state.draft, name: name.trim() };
        setDraft(state.draft);
      }
      if (equal(state.base, state.draft)) {
        return { ok: true, value: state.base };
      }
      const sent = state.draft,
        base = state.base,
        epoch = state.epoch;
      state.pending = true;
      state.expected = sent;
      setSaving(true);
      setError(false);
      try {
        const result = await saveDateResponse(roomId, sent.name, sent.availableDates, base);
        if (
          !state.active ||
          state.epoch !== epoch ||
          identity.current.roomId !== roomId ||
          identity.current.userId !== userId
        ) {
          return { ok: false, reason: 'superseded' };
        }
        if (
          result?.saved !== true ||
          !Object.hasOwn(result, 'saved') ||
          !Object.hasOwn(result, 'value') ||
          !result.value ||
          typeof result.value !== 'object' ||
          Array.isArray(result.value) ||
          !['name', 'availableDates', 'version'].every((key) => Object.hasOwn(result.value, key)) ||
          !validName(result.value.name) ||
          result.value.name !== result.value.name.trim() ||
          !Array.isArray(result.value.availableDates) ||
          result.value.availableDates.length > 28 ||
          new Set(result.value.availableDates).size !== result.value.availableDates.length ||
          !result.value.availableDates.every((date) => isCalendarDate(date))
        ) {
          throw new Error('Invalid acknowledgement');
        }
        // Validate the raw CAS token without reducing its microsecond precision.
        rawDateVersion(result.value.version);
        for (let index = 0; index < result.value.availableDates.length; index++) {
          if (
            !Object.hasOwn(result.value.availableDates, index) ||
            !isCalendarDate(result.value.availableDates[index])
          ) {
            throw new Error('Invalid acknowledgement');
          }
        }
        const current = constrainDateDraft(
          { name: result.value.name, availableDates: result.value.availableDates },
          latestRoom.current,
        ).value;
        // A receive can be newer than this response. Keep its delta as draft
        // intent, but only the actual ACK is a confirmed write baseline.
        const received = state.base ? rebaseDateDraft(base, state.base, current) : current;
        // A pre-dispatch local rename wins over a receive, as it did on the server.
        if (sent.name !== base.name) {
          received.name = current.name;
        }
        const next = rebaseDateDraft(state.expected || sent, state.draft || sent, received);
        state.base = current;
        const constrained = constrainDateDraft(next, latestRoom.current);
        state.draft = constrained.value;
        if (constrained.removed) {
          rangeBlocked.current = true;
          setRangeChanged(true);
        }
        setBaseline(current);
        setDraft(state.draft);
        return { ok: true, value: current };
      } catch {
        if (
          state.active &&
          state.epoch === epoch &&
          identity.current.roomId === roomId &&
          identity.current.userId === userId
        ) {
          setError(true);
        }
        return {
          ok: false,
          reason:
            state.epoch !== epoch ||
            identity.current.roomId !== roomId ||
            identity.current.userId !== userId
              ? 'superseded'
              : 'failed',
        };
      } finally {
        if (
          state.active &&
          state.epoch === epoch &&
          identity.current.roomId === roomId &&
          identity.current.userId === userId
        ) {
          state.pending = false;
          state.expected = null;
          setSaving(false);
        }
      }
    },
    [roomId, userId, guard],
  );
  const save = useCallback(
    (): Promise<DateResponseSaveResult> => executeRenameOrSave(),
    [executeRenameOrSave],
  );
  const rename = useCallback(
    (name: string): Promise<DateResponseSaveResult> => executeRenameOrSave(name),
    [executeRenameOrSave],
  );
  const dirty = !equal(draft, baseline);
  useEffect(() => {
    if (!dirty || saving || error || rangeChanged || !autosaveAllowed) {
      return;
    }
    const generation = autosaveGeneration;
    const timer = setTimeout(() => {
      if (
        permission.current.generation === generation &&
        permits(latestOptions.current?.canMutate) &&
        permits(latestOptions.current?.canAutosave)
      ) {
        void save();
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [dirty, draft, saving, error, rangeChanged, save, autosaveAllowed, autosaveGeneration]);
  return {
    draft,
    baseline,
    saving,
    error,
    dirty,
    rangeChanged,
    receive,
    edit,
    save,
    rename,
    acknowledgeRange: () => {
      rangeBlocked.current = false;
      setRangeChanged(false);
    },
  };
}
