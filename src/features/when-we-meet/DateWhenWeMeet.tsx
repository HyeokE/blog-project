'use client';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCraftAccount } from '@/app/craft/CraftAccount';
import { Button } from '@/components/ui/button';
import { RoomHeader, InviteLinkDialog, copyLink } from './RoomChrome';
import { inviteShareText } from './invite-share';
import { dateUuid } from './date-normalize.mjs';
import { toast } from 'sonner';
import { DateRoomSettings, type DateSettingsDraft, type DateSettingsOperation } from './DateRoomSettings';
import { renameRoom } from './api';
import { validateDateSettings } from './date-settings.mjs';
import { rawDateVersion } from './date-normalize.mjs';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DateAvailabilityCalendar } from './DateAvailabilityCalendar';
import { DateConfirmTab } from './DateConfirmTab';
import { normalizeDatePeople, consumeDateConfirmReturn } from './date-confirm-ui.mjs';
import { DateRoomResponseLoader, type DateRoomResponseResult } from './DateRoomResponseLoader';
import { DateRoomSkeleton } from './DateRoomSkeleton';
import { PeoplePanel } from './PeoplePanel';
import { Notice } from './Notice';
import { rebaseDateDraft, constrainDateDraft } from './date-calendar.mjs';
import { useDateAvailabilitySync } from './useDateAvailabilitySync';
import { loadDateRoom, updateDateRoomSchedule } from './date-api';
import type { DateResponse, DateRoom, DateRoomResult } from './date-contracts';
import { aggregateDateAvailability, datesInRange } from './date-availability.mjs';
import { useWwmCopy } from './i18n/WwmI18nProvider';
import './when-we-meet.css';
import './date-room.css';
type Person = { userId: string; displayName: string; isAdmin: boolean; hasAvailability: boolean };
type Props = {
  initialRoom: { room: DateRoom; userId: string };
  responsesPromise: Promise<DateRoomResponseResult>;
  confirmationPanel?: ReactNode;
  accountState?: { userId: string | null; loading: boolean };
  shareScope?: { current: { binding: string; generation: number } };
};
export function DateRoomContent({
  initialRoom,
  responsesPromise,
  confirmationPanel,
  accountState,
  shareScope,
}: Props) {
  const { t, locale, MEETING_TOASTS } = useWwmCopy();
  const [room, setRoom] = useState(initialRoom.room),
    [responses, setResponses] = useState<DateResponse[] | null>(null),
    [people, setPeople] = useState<Person[] | null>(null),
    [loadError, setLoadError] = useState(false),
    [syncError, setSyncError] = useState(false),
    [inspection, setInspection] = useState(initialRoom.room.startDate);
  const [tab, setTab] = useState('availability');
  useEffect(() => {
    try {
      if (
        consumeDateConfirmReturn(
          window.sessionStorage,
          initialRoom.room.id,
          initialRoom.userId,
          window.location.search,
        )
      ) {
        setTab('confirmation');
      }
    } catch {
      /* tab storage unavailable */
    }
  }, [initialRoom.room.id, initialRoom.userId]);
  const active = useRef(true),
    pending = useRef(false),
    scope = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    scope.current = controller;
    active.current = true;
    return () => {
      active.current = false;
      controller.abort();
    };
  }, []);
  const schedule = useMemo(
    () => ({ startDate: room.startDate, endDate: room.endDate, timezone: room.timezone }),
    [room.startDate, room.endDate, room.timezone],
  );
  // Latest render permission is read by retained hook callbacks and timers,
  // before effects can clean up the previous authenticated render.
  const settingsFlight = useRef<{ serial: number; namePhase: boolean; nameBaseline: string } | null>(null);
  const settingsSerial = useRef(0);
  const readEpoch = useRef(0);
  const reloadRequired = useRef(false);
  const actualTrim = useRef<{
    removedDates: number; previewRemovedDates: number | null; requiresReview: boolean;
    ownRemovedDates: readonly string[]; remainingOwnDates: readonly string[];
    reviewedBinding: string | null;
  } | null>(null);
  const impactScope = useRef({ key: '', generation: 0, binding: '' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSession, setSettingsSession] = useState(0);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState('');
  const [settingsConflict, setSettingsConflict] = useState(false);
  const [, setSettingsRevision] = useState(0);
  const mutationPermission = useRef(false);
  mutationPermission.current =
    room.id === initialRoom.room.id &&
    (!accountState || (!accountState.loading && accountState.userId === initialRoom.userId));
  const wrapperGeneration = shareScope?.current.generation;
  const authorizedNow = useCallback(() => mutationPermission.current && (!shareScope || shareScope.current.generation === wrapperGeneration), [shareScope, wrapperGeneration]);
  const model = useDateAvailabilitySync(room.id, initialRoom.userId, schedule, {
    canMutate: () => authorizedNow() &&
      (!settingsFlight.current || settingsFlight.current.namePhase) &&
      !reloadRequired.current && (!actualTrim.current || (Boolean(settingsFlight.current?.namePhase) && actualTrim.current.reviewedBinding === impactScope.current.binding)),
    canAutosave: () => authorizedNow() && !settingsFlight.current && !reloadRequired.current && !actualTrim.current,
  });
  const impactData = JSON.stringify([responses, people, model.draft?.availableDates ?? null]);
  if (impactScope.current.key !== impactData) {
    impactScope.current.key = impactData;
    impactScope.current.generation++;
    impactScope.current.binding = JSON.stringify([impactScope.current.generation, impactData]);
    if (actualTrim.current) {actualTrim.current.reviewedBinding = null;}
  }
  const impactBinding = impactScope.current.binding;
  const latestSettings = useRef({ room, model, authorized: mutationPermission.current, generation: 0, binding: '' });
  const settingsBinding = JSON.stringify([initialRoom.room.id, initialRoom.userId, room, mutationPermission.current, Boolean(accountState?.loading)]);
  if (latestSettings.current.binding !== settingsBinding) {
    latestSettings.current.generation++;
    if (actualTrim.current) {actualTrim.current.reviewedBinding = null;}
    latestSettings.current.binding = settingsBinding;
  }
  latestSettings.current.room = room;
  latestSettings.current.model = model;
  latestSettings.current.authorized = mutationPermission.current;
  const settingsGeneration = latestSettings.current.generation;
  const menuTrigger = useRef<HTMLButtonElement | null>(null);
  const [invitation, setInvitation] = useState<{
    link: string;
    share: string;
    binding: string;
  } | null>(null);
  const shareBinding = JSON.stringify([
    initialRoom.room.id,
    initialRoom.userId,
    room.id,
    room.inviteToken,
    room.role,
    accountState?.userId ?? initialRoom.userId,
    Boolean(accountState?.loading),
  ]);
  const latestShare = useRef({ binding: shareBinding, generation: 0 });
  if (latestShare.current.binding !== shareBinding) {
    latestShare.current = { binding: shareBinding, generation: latestShare.current.generation + 1 };
  }
  const shareGeneration = latestShare.current.generation;
  const ownerGeneration = shareScope?.current.generation;
  const onInvite = async () => {
    const current = () =>
      active.current &&
      (!shareScope || shareScope.current.generation === ownerGeneration) &&
      latestShare.current.binding === shareBinding &&
      latestShare.current.generation === shareGeneration;
    if (
      !current() ||
      accountState?.loading ||
      (accountState && accountState.userId !== initialRoom.userId) ||
      room.id !== initialRoom.room.id
    ) {
      return;
    }
    if (!dateUuid(room.inviteToken)) {
      toast.error(t('room.linkUnavailable'));
      return;
    }
    const link = `${window.location.origin}/craft/when-we-meet/${encodeURIComponent(room.id)}?invite=${room.inviteToken}`;
    const share = inviteShareText(
      link,
      model.draft?.name ||
        responses?.find((value) => value.userId === initialRoom.userId)?.displayName,
      locale,
    );
    const copied = await copyLink(share, MEETING_TOASTS.linkCopied, current);
    if (current() && !copied) {
      setInvitation({ link, share, binding: shareBinding });
    }
  };
  const receive = model.receive;
  const apply = useCallback(
    (value: DateRoomResult) => {
      if (
        value.userId !== initialRoom.userId ||
        value.room.id !== initialRoom.room.id ||
        value.room.scheduleMode !== 'date'
      ) {
        throw new Error('Identity changed.');
      }
      datesInRange(value.room.startDate, value.room.endDate);
      const own = value.responses.find((response) => response.userId === value.userId);
      if (!own) {
        throw new Error('Own response unavailable.');
      }
      aggregateDateAvailability(value.room, value.responses, null);
      setRoom(value.room);
      setResponses(value.responses);
      receive({ name: own.displayName, availableDates: own.availableDates }, value.room);
      setLoadError(false);
      setSyncError(false);
    },
    [initialRoom.userId, initialRoom.room.id, receive],
  );
  const onReady = useCallback(
    (value: DateRoomResponseResult) => {
      if (value.error) {
        setLoadError(true);
        return;
      }
      try {
        apply({
          room: initialRoom.room,
          userId: initialRoom.userId,
          responses: value.responses || [],
        });
      } catch {
        setLoadError(true);
      }
    },
    [apply, initialRoom],
  );
  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (pending.current || settingsFlight.current || reloadRequired.current || !authorizedNow()) {
        return;
      }
      pending.current = true;
      const epoch = readEpoch.current;
      const generation = latestSettings.current.generation;
      try {
        const value = await loadDateRoom(initialRoom.room.id, signal || scope.current?.signal);
        if (!signal?.aborted && active.current && readEpoch.current === epoch && latestSettings.current.generation === generation && authorizedNow()) {
          apply(value);
        }
      } catch {
        if (!signal?.aborted && active.current && readEpoch.current === epoch && latestSettings.current.generation === generation && authorizedNow()) {
          setSyncError(true);
        }
      } finally {
        if (readEpoch.current === epoch) { pending.current = false; }
      }
    },
    [initialRoom.room.id, apply, authorizedNow],
  );
  // Bounded same-origin polling, not an SSE/live-connection claim. No overlapping reads.
  const hydrated = responses !== null;
  useEffect(() => {
    if (!hydrated || settingsBusy || reloadRequired.current || !authorizedNow()) {
      return;
    }
    const controller = new AbortController();
    active.current = true;
    let timer: ReturnType<typeof setTimeout>;
    let ticks = 0;
    const poll = async () => {
      await refresh(controller.signal);
      if (!controller.signal.aborted && ++ticks < 55) {
        timer = setTimeout(poll, 3000);
      }
    };
    timer = setTimeout(poll, 3000);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [hydrated, refresh, settingsBusy, settingsBinding, authorizedNow]);
  useEffect(() => {
    const controller = new AbortController();
    const generation = latestSettings.current.generation;
    const epoch = readEpoch.current;
    void fetch(`/api/craft/when-we-meet/${encodeURIComponent(room.id)}/people`, {
      signal: controller.signal,
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error();
        }
        const value = await response.json();
        const roster = normalizeDatePeople(value.people);
        if (!controller.signal.aborted && latestSettings.current.generation === generation && readEpoch.current === epoch && authorizedNow()) {
          setPeople(roster);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted && latestSettings.current.generation === generation && readEpoch.current === epoch && authorizedNow()) {
          setPeople(null);
        }
      });
    return () => controller.abort();
  }, [room.id, responses, settingsBinding, authorizedNow]);
  function validateReload(value: DateRoomResult) {
    const ownFields = (item: unknown, keys: string[]) => item && typeof item === 'object' && !Array.isArray(item) && keys.every(key => Object.hasOwn(item, key));
    if (!ownFields(value, ['room', 'userId', 'responses']) || value.userId !== initialRoom.userId ||
      !ownFields(value.room, ['id', 'title', 'ownerId', 'role', 'scheduleMode', 'startDate', 'endDate', 'timezone', 'startTime', 'endTime']) ||
      value.room.id !== initialRoom.room.id || typeof value.room.ownerId !== 'string' || !value.room.ownerId || value.room.scheduleMode !== 'date' || value.room.startTime !== null || value.room.endTime !== null ||
      !['ADMIN', 'MEMBER'].includes(value.room.role) || (value.room.role === 'ADMIN') !== (value.room.ownerId === value.userId) ||
      !Array.isArray(value.responses)) { throw new Error(); }
    const own = value.responses.find(response => response?.userId === value.userId);
    if (!own) { throw new Error(); }
    const errors = validateDateSettings({ ...value.room, name: own.displayName }, { room: value.room });
    if (Object.keys(errors).length || value.room.title !== value.room.title.trim()) { throw new Error(); }
    const seen = new Set<string>();
    const allowed = new Set(datesInRange(value.room.startDate, value.room.endDate));
    for (let i = 0; i < value.responses.length; i++) {
      const response = value.responses[i];
      if (!Object.hasOwn(value.responses, i) || !ownFields(response, ['userId', 'displayName', 'availableDates', 'updatedAt']) ||
        typeof response.userId !== 'string' || seen.has(response.userId) || typeof response.displayName !== 'string' ||
        response.displayName !== response.displayName.trim() || !response.displayName || response.displayName.length > 50 || /[\u0000-\u001f\u007f]/.test(response.displayName) ||
        !Array.isArray(response.availableDates) || response.availableDates.length > 28 || new Set(response.availableDates).size !== response.availableDates.length) { throw new Error(); }
      rawDateVersion(response.updatedAt);
      for (let j = 0; j < response.availableDates.length; j++) {
        if (!Object.hasOwn(response.availableDates, j) || !allowed.has(response.availableDates[j])) { throw new Error(); }
      }
      seen.add(response.userId);
    }
  }
  async function submitSettings(draft: Readonly<DateSettingsDraft>, operation: DateSettingsOperation) {
    if (settingsFlight.current || settingsConflict || !authorizedNow() || !model.baseline || !hydrated || model.saving || (model.rangeChanged && !reloadRequired.current) || !operation.isCurrent() || latestSettings.current.generation !== settingsGeneration) { return; }
    const owner = latestSettings.current.room.role === 'ADMIN' && latestSettings.current.room.ownerId === initialRoom.userId;
    const target = owner ? draft : { ...latestSettings.current.room, name: draft.name };
    const errors = validateDateSettings(target, { room: latestSettings.current.room });
    if (!reloadRequired.current && (owner ? Object.keys(errors).length : errors.name)) { return; }
    const shrink = owner && (draft.startDate > latestSettings.current.room.startDate || draft.endDate < latestSettings.current.room.endDate);
    const reviewedShrink = () => {
      try { return Boolean(operation.hasReviewedShrink?.(draft, impactScope.current.binding)); }
      catch { return false; }
    };
    if (!reloadRequired.current && ((shrink && !reviewedShrink()) || (actualTrim.current && actualTrim.current.reviewedBinding !== impactScope.current.binding))) {
      setSettingsError('Review the changed availability, then save again.'); return;
    }
    const flight = { serial: ++settingsSerial.current, namePhase: false, nameBaseline: model.baseline.name };
    settingsFlight.current = flight;
    const generation = latestSettings.current.generation;
    const current = () => active.current && settingsFlight.current === flight && authorizedNow() &&
      latestSettings.current.generation === generation && operation.isCurrent() &&
      operation.roomId === initialRoom.room.id && operation.userId === initialRoom.userId &&
      (!owner || (latestSettings.current.room.role === 'ADMIN' && latestSettings.current.room.ownerId === initialRoom.userId));
    const commitRoom = (next: DateRoom) => {
      if (!current()) { return false; }
      latestSettings.current.room = next;
      latestSettings.current.binding = JSON.stringify([initialRoom.room.id, initialRoom.userId, next, mutationPermission.current, Boolean(accountState?.loading)]);
      setRoom(next); return true;
    };
    const scheduleEqual = (a: { startDate: string; endDate: string; timezone: string }, b: { startDate: string; endDate: string; timezone: string }) =>
      a.startDate === b.startDate && a.endDate === b.endDate && a.timezone === b.timezone;
    const record = (value: unknown, keys: string[]) => Boolean(value && typeof value === 'object' && !Array.isArray(value) && keys.every(key => Object.hasOwn(value, key)));
    // Invalidate all old polling results before the first possible mutation.
    readEpoch.current++; pending.current = false;
    setSettingsBusy(true); setSettingsError('');
    try {
      if (owner && !reloadRequired.current && draft.title !== latestSettings.current.room.title) {
        if (!current()) { return; }
        const ack = await renameRoom(initialRoom.room.id, draft.title);
        if (!current()) { return; }
        if (!record(ack, ['title']) || typeof ack.title !== 'string' || ack.title !== ack.title.trim() || validateDateSettings({ ...latestSettings.current.room, title: ack.title, name: flight.nameBaseline }, { room: latestSettings.current.room }).title || !operation.acceptAcknowledgement({ title: ack.title })) { throw new Error(); }
        if (!commitRoom({ ...latestSettings.current.room, title: ack.title })) { return; }
      }
      if (owner && !reloadRequired.current && !scheduleEqual(draft, latestSettings.current.room)) {
        if (!current() || (shrink && !reviewedShrink())) { return; }
        const ack = await updateDateRoomSchedule(initialRoom.room.id, { startDate: draft.startDate, endDate: draft.endDate, timezone: draft.timezone });
        if (!current()) { return; }
        if (!record(ack, ['schedule', 'removedDates']) || !record(ack.schedule, ['startDate', 'endDate', 'timezone']) ||
          !Number.isSafeInteger(ack.removedDates) || ack.removedDates < 0 ||
          Object.keys(validateDateSettings({ ...latestSettings.current.room, ...ack.schedule, name: flight.nameBaseline }, { room: { ...latestSettings.current.room, startDate: ack.schedule.startDate } })).length > 0 ||
          !operation.acceptAcknowledgement(ack.schedule)) { throw new Error(); }
        reloadRequired.current = true;
        actualTrim.current = {
          removedDates: ack.removedDates, previewRemovedDates: operation.previewRemovedDates ?? null,
          requiresReview: shrink || ack.schedule.startDate > latestSettings.current.room.startDate || ack.schedule.endDate < latestSettings.current.room.endDate,
          ownRemovedDates: Object.freeze([]), remainingOwnDates: Object.freeze([]), reviewedBinding: null,
        };
        if (!commitRoom({ ...latestSettings.current.room, ...ack.schedule })) { return; }
      }
      if (reloadRequired.current) {
        if (!current()) { return; }
        const epoch = ++readEpoch.current;
        // This read deliberately does not call refresh's pending early-return.
        const value = await loadDateRoom(initialRoom.room.id, scope.current?.signal);
        if (!current() || epoch !== readEpoch.current) { return; }
        validateReload(value);
        const expected = latestSettings.current.room;
        const own = value.responses.find(response => response.userId === initialRoom.userId);
        if (!own) { throw new Error(); }
        // All ACK counts survive load failure. An expansion's summary is resolved
        // by this authoritative read; a shrink requires a separate explicit review.
        if (actualTrim.current && !actualTrim.current.requiresReview) {actualTrim.current = null;}
        if (actualTrim.current) {
          const currentModel = latestSettings.current.model;
          if (!currentModel.baseline || !currentModel.draft) {throw new Error();}
          const incoming = constrainDateDraft({ name: own.displayName, availableDates: own.availableDates }, value.room).value;
          // Reuse the hook's pure rebase rules before receive. Saved removals are
          // already reflected by the authoritative baseline; only the local dates
          // actually constrained out of that rebased draft need acknowledgement.
          const rebased = rebaseDateDraft(currentModel.baseline, currentModel.draft, incoming);
          actualTrim.current.ownRemovedDates = Object.freeze(rebased.availableDates.filter(date => date < value.room.startDate || date > value.room.endDate));
          actualTrim.current.remainingOwnDates = Object.freeze([...constrainDateDraft(rebased, value.room).value.availableDates]);
          actualTrim.current.reviewedBinding = null;
        }
        if (value.room.title !== expected.title || !scheduleEqual(value.room, expected) || value.room.role !== expected.role || value.room.ownerId !== expected.ownerId || value.room.inviteToken !== expected.inviteToken || own.displayName !== latestSettings.current.model.baseline?.name) {
          apply(value); reloadRequired.current = false;
          setSettingsConflict(true);
          setSettingsError('Meeting settings changed. Use latest settings before saving again.'); return;
        }
        if (!commitRoom(value.room)) { return; }
        apply(value);
        reloadRequired.current = false;
        if (actualTrim.current) {
          setSettingsError('Review the saved availability changes, then save again.');
          setSettingsRevision(value => value + 1);
          return;
        }
        setSettingsRevision(value => value + 1);
      }
      if (!current()) { return; }
      if (latestSettings.current.model.rangeChanged) {
        setSettingsError('Review the changed availability, then save again.'); return;
      }
      if (draft.name !== latestSettings.current.model.baseline?.name) {
        if (!current()) { return; }
        flight.namePhase = true;
        const result = await latestSettings.current.model.rename(draft.name);
        if (!current()) { return; }
        if (!result.ok || !record(result.value, ['name', 'availableDates']) || !operation.acceptAcknowledgement({ name: result.value.name })) { throw new Error(); }
        flight.nameBaseline = result.value.name;
      }
      if (!current() || reloadRequired.current) { return; }
      actualTrim.current = null;
      setSettingsOpen(false);
      toast.success('Settings saved.');
    } catch {
      if (current()) { setSettingsError(reloadRequired.current ? 'Schedule saved. Reload failed. Retry to load the latest availability.' : 'Settings could not be saved. Retry to continue.'); }
    } finally {
      // Local form revocation is not cancellation: hold the global lock until
      // the server promise settles, then only its exact owner can release it.
      if (settingsFlight.current === flight) {
        settingsFlight.current = null;
        setSettingsBusy(false); setSettingsRevision(value => value + 1);
      }
    }
  }
  const aggregate = useMemo(
    () => aggregateDateAvailability(room, responses || [], people),
    [room, responses, people],
  );
  const visibleInspection =
    inspection >= room.startDate && inspection <= room.endDate ? inspection : room.startDate;
  useEffect(() => {
    if (inspection !== visibleInspection) {
      setInspection(visibleInspection);
    }
  }, [inspection, visibleInspection]);
  const panel =
    confirmationPanel ??
    (hydrated ? <DateConfirmTab room={room} responses={responses || []} /> : null);
  const day = aggregate.dates.find((value) => value.date === visibleInspection);
  const display = (value: string) => value.replaceAll('-', '.');
  const groups = [
    ['dateRoom.available', day?.availableUserIds],
    ['dateRoom.excluded', day?.unavailableUserIds],
    ['dateRoom.notResponded', day?.nonrespondentUserIds],
  ] as const;
  if (accountState && (
    (accountState.userId !== null && accountState.userId !== initialRoom.userId) ||
    (!accountState.loading && accountState.userId !== initialRoom.userId)
  )) {
    return null;
  }
  return (
    <main className="wwm wwm-room wwm-date-room">
      <div className="wwm-date-header">
        <RoomHeader
          title={room.title}
          startDate={room.startDate}
          endDate={room.endDate}
          timezone={room.timezone}
          confirmation={null}
          offline={false}
          settingsDisabled={!hydrated || !model.baseline || !mutationPermission.current || model.saving || settingsBusy || reloadRequired.current}
          menuTrigger={menuTrigger}
          onInvite={onInvite}
          onSettings={() => {
            if (!authorizedNow() || settingsFlight.current || reloadRequired.current || !model.baseline || !hydrated || model.saving || latestSettings.current.generation !== settingsGeneration) { return; }
            setSettingsSession(value => value + 1);
            setSettingsError('');
            setSettingsOpen(true);
          }}
        />
        <div className="wwm-date-actions">
          <Button
            disabled={!mutationPermission.current || settingsBusy || reloadRequired.current || Boolean(actualTrim.current) || !model.draft || !model.dirty || model.saving || model.rangeChanged}
            onClick={() => { if (authorizedNow() && !settingsFlight.current && !reloadRequired.current && latestSettings.current.generation === settingsGeneration) { void latestSettings.current.model.save(); } }}
          >
            {t(model.saving ? 'dateRoom.saving' : 'dateRoom.save')}
          </Button>
        </div>
      </div>
      <DateRoomSettings
        room={room} userId={initialRoom.userId} name={settingsFlight.current?.namePhase ? settingsFlight.current.nameBaseline : model.baseline?.name || ''}
        responses={mutationPermission.current ? responses : null}
        people={mutationPermission.current ? people : null}
        ownDraftDates={mutationPermission.current ? model.draft?.availableDates ?? null : null}
        impactBinding={impactBinding}
        actualTrim={actualTrim.current ? {
          removedDates: actualTrim.current.removedDates, previewRemovedDates: actualTrim.current.previewRemovedDates,
          ownRemovedDates: actualTrim.current.ownRemovedDates,
          remainingOwnDates: model.draft?.availableDates ?? actualTrim.current.remainingOwnDates,
          reviewed: actualTrim.current.reviewedBinding === impactBinding,
        } : null}
        authorized={mutationPermission.current && hydrated && Boolean(model.baseline)}
        authLoading={Boolean(accountState?.loading)} open={settingsOpen} session={settingsSession}
        saving={settingsBusy} submitError={settingsError} externalConflict={settingsConflict}
        onUseLatest={() => {
          if (authorizedNow() && !settingsFlight.current && !reloadRequired.current && latestSettings.current.generation === settingsGeneration) { setSettingsConflict(false); setSettingsError(''); }
        }}
        closeBlocked={reloadRequired.current}
        rangeChanged={model.rangeChanged}
        onReviewRange={() => {
          if (authorizedNow() && !settingsFlight.current && !reloadRequired.current && latestSettings.current.generation === settingsGeneration) {
            if (impactScope.current.binding !== impactBinding || !responses || !model.draft) {return;}
            if (actualTrim.current) {actualTrim.current.reviewedBinding = impactBinding;}
            model.acknowledgeRange(); setSettingsError(''); setSettingsRevision(value => value + 1);
          }
        }}
        onOpenChange={next => {
          if (!next && authorizedNow() && !settingsFlight.current && !reloadRequired.current && latestSettings.current.generation === settingsGeneration) { setSettingsOpen(false); }
        }}
        onSubmit={submitSettings}
      />
      {invitation?.binding === shareBinding && (
        <InviteLinkDialog
          link={invitation.link}
          share={invitation.share}
          onClose={() => setInvitation(null)}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            menuTrigger.current?.focus();
          }}
        />
      )}
      {hydrated && (
        <div className="wwm-date-status" role="status">
          {model.error
            ? ''
            : model.saving
              ? t('dateRoom.saving')
              : model.dirty
                ? t('dateRoom.unsaved')
                : model.draft
                  ? t('dateRoom.saved')
                  : ''}
        </div>
      )}
      {model.rangeChanged && (
        <Notice
          tone="warning"
          action={<Button onClick={() => { if (authorizedNow() && !settingsFlight.current && !reloadRequired.current && latestSettings.current.generation === settingsGeneration && !actualTrim.current) { latestSettings.current.model.acknowledgeRange(); } }}>{t('dateRoom.reviewed')}</Button>}
        >
          {t('dateRoom.rangeChanged')}
        </Notice>
      )}
      {model.error && !settingsOpen && (
        <Notice
          tone="error"
          action={<Button onClick={() => { if (authorizedNow() && !settingsFlight.current && !reloadRequired.current && latestSettings.current.generation === settingsGeneration) { void latestSettings.current.model.save(); } }}>{t('common.retry')}</Button>}
        >
          {t('dateRoom.saveFailed')}
        </Notice>
      )}
      {syncError && (
        <Notice
          tone="error"
          action={<Button onClick={() => void refresh()}>{t('common.retry')}</Button>}
        >
          {t('dateRoom.syncFailed')}
        </Notice>
      )}
      {responses === null && (
        <Suspense fallback={<DateRoomSkeleton />}>
          <DateRoomResponseLoader result={responsesPromise} onReady={onReady} />
        </Suspense>
      )}
      {loadError && (
        <Notice
          tone="error"
          action={<Button onClick={() => void refresh()}>{t('common.retry')}</Button>}
        >
          {t('dateRoom.loadFailed')}
        </Notice>
      )}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="wwm-date-tabs">
          <TabsTrigger className="wwm-date-tab" value="availability">{t('dateRoom.availability')}</TabsTrigger>
          <TabsTrigger className="wwm-date-tab" value="everyone">{t('dateRoom.everyone')}</TabsTrigger>
          <TabsTrigger className="wwm-date-tab" value="people">{t('people.heading')}</TabsTrigger>
          {panel && <TabsTrigger className="wwm-date-tab" value="confirmation">{t('dateRoom.confirmation')}</TabsTrigger>}
        </TabsList>
        <TabsContent value="availability">
          <DateAvailabilityCalendar
            room={room}
            selected={model.draft?.availableDates || []}
            disabled={!mutationPermission.current || settingsBusy || reloadRequired.current || !model.draft}
            onChange={(availableDates) => {
              if (authorizedNow() && !settingsFlight.current && !reloadRequired.current && latestSettings.current.generation === settingsGeneration && latestSettings.current.model.draft) {
                // Advance before editing, so two batched changes (including an
                // undo back to the same dates) cannot restore an old consent.
                impactScope.current.generation++;
                impactScope.current.binding = JSON.stringify([impactScope.current.generation, impactScope.current.key]);
                if (actualTrim.current) {actualTrim.current.reviewedBinding = null;}
                latestSettings.current.model.edit({ ...latestSettings.current.model.draft, availableDates });
              }
            }}
          />
        </TabsContent>
        <TabsContent value="everyone">
          <DateAvailabilityCalendar
            room={room}
            selected={[]}
            disabled={responses === null}
            onChange={() => undefined}
            inspection={visibleInspection}
            onInspect={setInspection}
          />
          <h2>{display(visibleInspection)}</h2>
          <div className="wwm-date-groups">
            {groups.map(([label, ids]) => (
              <section key={label}>
                <h3>{t(label)}</h3>
                {people === null || ids == null ? (
                  <p>{t('dateRoom.rosterUnknown')}</p>
                ) : (
                  <ul>
                    {ids.map((id) => {
                      const person = people.find((value) => value.userId === id);
                      return person ? <li key={id}>{person.displayName}</li> : null;
                    })}
                    {ids.length === 0 && <li>{t('dateRoom.none')}</li>}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="people">
          <PeoplePanel roomId={room.id} userId={initialRoom.userId} />
        </TabsContent>
        {panel && <TabsContent value="confirmation">{panel}</TabsContent>}
      </Tabs>
    </main>
  );
}
export default function DateWhenWeMeet(props: Props) {
  const { user, loading } = useCraftAccount();
  const binding = JSON.stringify([
    props.initialRoom.room.id,
    props.initialRoom.userId,
    user?.id,
    loading,
  ]);
  const shareScope = useRef({ binding, generation: 0 });
  if (shareScope.current.binding !== binding) {
    shareScope.current = { binding, generation: shareScope.current.generation + 1 };
  }
  if ((user?.id != null && user.id !== props.initialRoom.userId) ||
      (!loading && user?.id !== props.initialRoom.userId)) {
    return null;
  }
  return (
    <DateRoomContent
      key={`${props.initialRoom.room.id}:${props.initialRoom.userId}`}
      {...props}
      accountState={{ userId: user?.id ?? null, loading }}
      shareScope={shareScope}
    />
  );
}
