'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RequiredFieldLabel } from '@/components/craft/RequiredFieldLabel';
import { DateRangePicker } from './DateRangePicker';
import { TimezoneCombobox } from './TimezoneCombobox';
import { validateDateSettings, type DateSettingsErrors } from './date-settings.mjs';
import { rawDateVersion } from './date-normalize.mjs';
import { todayInTimezone } from './creation-validation.mjs';
import { useWwmCopy } from './i18n/WwmI18nProvider';
import type { DateResponse, DateRoom } from './date-contracts';
import './date-settings.css';

export type DateSettingsDraft = {
  title: string;
  startDate: string;
  endDate: string;
  timezone: string;
  name: string;
};

/** A local consent scope, not a server revision or cancellation guarantee. */
export type DateSettingsOperation = Readonly<{
  roomId: string;
  userId: string;
  session: number;
  generation: number;
  draftVersion: number;
  owner: boolean;
  isCurrent: () => boolean;
  /** Capability bound to the reviewed immutable target and current data generation. */
  hasReviewedShrink: (target: Readonly<DateSettingsDraft>, impactBinding: string) => boolean;
  previewRemovedDates: number | null;
  /** Call only with a validated server ACK, immediately before its parent commit.
   * Exactly one complete field group is rebound; all other scope changes revoke. */
  acceptAcknowledgement: (patch: Readonly<Partial<DateSettingsDraft>>) => boolean;
}>;

export type DateRoomSettingsProps = {
  room: DateRoom;
  userId: string;
  /** Actual saved own name, never the availability hook's editable name. */
  name: string;
  responses?: readonly DateResponse[] | null;
  people?: ReadonlyArray<{ userId: string; displayName: string; isAdmin: boolean; hasAvailability: boolean }> | null;
  ownDraftDates?: readonly string[] | null;
  /** Parent-owned monotonic response/own-date/roster generation. */
  impactBinding?: string;
  actualTrim?: Readonly<{ removedDates: number; previewRemovedDates: number | null; ownRemovedDates: readonly string[]; remainingOwnDates: readonly string[]; reviewed: boolean }> | null;
  authorized: boolean;
  authLoading: boolean;
  open: boolean;
  session: number;
  saving?: boolean;
  blockedReason?: string;
  closeBlocked?: boolean;
  rangeChanged?: boolean;
  onReviewRange?: () => void;
  submitError?: string;
  externalConflict?: boolean;
  onUseLatest?: () => void;
  now?: () => Date;
  onOpenChange: (open: boolean) => void;
  /** Explicit Save only. Caller owns transport, ACKs, reconciliation and closing. */
  onSubmit: (draft: Readonly<DateSettingsDraft>, operation: DateSettingsOperation) => void | Promise<unknown>;
};

type Group = 'title' | 'schedule' | 'name';
type FormState = {
  resetKey: string;
  contextKey: string;
  baseline: DateSettingsDraft;
  remote: DateSettingsDraft;
  draft: DateSettingsDraft;
  conflicts: Set<Group>;
  errors: DateSettingsErrors;
  failed: boolean;
  generation: number;
  version: number;
  serial: number;
  pending: number | null;
  review: ImpactReview | null;
  consent: ImpactReview | null;
  reviewSerial: number;
  previewUnavailable: boolean;
};
const groups: Group[] = ['title', 'schedule', 'name'];
const groupKeys: Record<Group, Array<keyof DateSettingsDraft>> = {
  title: ['title'], schedule: ['startDate', 'endDate', 'timezone'], name: ['name'],
};
function sameGroup(a: DateSettingsDraft, b: DateSettingsDraft, group: Group) {
  return groupKeys[group].every(key => group === 'schedule' ? a[key] === b[key] : a[key].trim() === b[key].trim());
}
function authoritative({ room, name }: DateRoomSettingsProps): DateSettingsDraft {
  return { title: room.title, startDate: room.startDate, endDate: room.endDate, timezone: room.timezone, name };
}
function ownerOf({ room, userId }: DateRoomSettingsProps) {
  return room.role === 'ADMIN' && room.ownerId === userId;
}
function fieldErrors(draft: DateSettingsDraft, props: DateRoomSettingsProps): DateSettingsErrors {
  const errors = validateDateSettings(draft, { room: props.room, now: props.now?.() ?? new Date() });
  // A member's hidden metadata is authoritative, not editable or a name-save gate.
  return ownerOf(props) ? errors : errors.name ? { name: errors.name } : {};
}

type ImpactReview = Readonly<{
  nonce: number; generation: number; version: number; binding: string; fingerprint: string;
  target: Readonly<DateSettingsDraft>;
  removedByUser: ReadonlyArray<Readonly<{ userId: string; name: string; dates: readonly string[] }>>;
  savedRemoved: number; ownRemoved: readonly string[]; rosterUnavailable: boolean;
}>;
function impactKey(props: DateRoomSettingsProps) {
  // Dense/own-field validation happens before displaying or consenting. The key
  // observes all raw data, including name and full-precision response revisions.
  return JSON.stringify([props.impactBinding, props.responses, props.people, props.ownDraftDates]);
}
function contextFor(props: DateRoomSettingsProps, resetKey: string, baseline: DateSettingsDraft) {
  return JSON.stringify([resetKey, props.authorized, props.authLoading, { ...props.room, ...baseline, name: undefined }, baseline, props.blockedReason, impactKey(props)]);
}
function preview(props: DateRoomSettingsProps, draft: DateSettingsDraft, nonce: number, generation: number, version: number): ImpactReview | null {
  const dense = (value: unknown): value is unknown[] => Array.isArray(value) && Array.from({ length: value.length }, (_, i) => Object.hasOwn(value, i)).every(Boolean);
  const record = (value: unknown, keys: string[]) => Boolean(value && typeof value === 'object' && !Array.isArray(value) && keys.every(key => Object.hasOwn(value, key)));
  const dates = (value: unknown): value is string[] => dense(value) && value.length <= 28 && new Set(value).size === value.length && value.every(date => {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {return false;}
    const parsed = new Date(`${date}T12:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date && date >= props.room.startDate && date <= props.room.endDate;
  });
  if (!dense(props.responses) || !dates(props.ownDraftDates)) {return null;}
  if (props.people != null && (!dense(props.people) || props.people.some(person => !record(person, ['userId', 'displayName', 'isAdmin', 'hasAvailability']) || typeof person.userId !== 'string' || !person.userId || typeof person.displayName !== 'string' || !person.displayName.trim() || typeof person.isAdmin !== 'boolean' || typeof person.hasAvailability !== 'boolean') || new Set(props.people.map(person => person.userId)).size !== props.people.length)) {return null;}
  const seen = new Set<string>();
  const removedByUser: Array<Readonly<{ userId: string; name: string; dates: readonly string[] }>> = [];
  for (const value of props.responses) {
    if (!record(value, ['userId', 'displayName', 'availableDates', 'updatedAt']) || typeof value.userId !== 'string' || !value.userId || seen.has(value.userId) || typeof value.displayName !== 'string' || !value.displayName.trim() || value.displayName !== value.displayName.trim() || value.displayName.length > 50 || /[\u0000-\u001f\u007f]/.test(value.displayName) || !dates(value.availableDates)) {return null;}
    try {rawDateVersion(value.updatedAt);} catch {return null;}
    seen.add(value.userId);
    const removed = value.availableDates.filter(date => date < draft.startDate || date > draft.endDate);
    if (removed.length) {removedByUser.push(Object.freeze({ userId: value.userId, name: value.displayName, dates: Object.freeze([...removed]) }));}
  }
  return Object.freeze({ nonce, generation, version, fingerprint: impactKey(props), binding: props.impactBinding ?? impactKey(props), target: Object.freeze({ ...draft }), removedByUser: Object.freeze(removedByUser), savedRemoved: removedByUser.reduce((sum, value) => sum + value.dates.length, 0), ownRemoved: Object.freeze(props.ownDraftDates.filter(date => date < draft.startDate || date > draft.endDate)), rosterUnavailable: props.people == null });
}

export function DateRoomSettings(props: DateRoomSettingsProps) {
  const { t } = useWwmCopy();
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const mounted = useRef(true);
  const latest = useRef(props);
  latest.current = props;
  const [, setRevision] = useState(0);
  const redraw = () => { if (mounted.current) {setRevision(value => value + 1);} };
  const currentBaseline = authoritative(props);
  const resetKey = JSON.stringify([props.room.id, props.userId, props.session, props.open]);
  const contextKey = contextFor(props, resetKey, currentBaseline);
  const stateRef = useRef<FormState>({
    resetKey, contextKey, baseline: currentBaseline, remote: currentBaseline, draft: { ...currentBaseline },
    conflicts: new Set(), errors: {}, failed: false, generation: 0, version: 0, serial: 0, pending: null, review: null, consent: null, reviewSerial: 0, previewUnavailable: false,
  });
  const state = stateRef.current;
  // Revoke synchronously during render, before an effect or a retained callback can run.
  if (state.contextKey !== contextKey) {
    state.contextKey = contextKey;
    state.generation++;
    state.version++;
    state.review = null; state.consent = null; state.previewUnavailable = false;
    state.pending = null;
    if (state.resetKey !== resetKey) {
      state.resetKey = resetKey;
      state.baseline = currentBaseline;
      state.draft = { ...currentBaseline };
      state.conflicts.clear();
      state.errors = {};
      state.failed = false;
    } else {
      for (const group of groups) {
        if (sameGroup(currentBaseline, state.baseline, group)) {
          // Once a dirty remote conflict is observed, ABA cannot silently resolve it.
          continue;
        }
        if (sameGroup(state.draft, state.baseline, group) && !state.conflicts.has(group)) {
          for (const key of groupKeys[group]) {
            state.baseline[key] = currentBaseline[key];
            state.draft[key] = currentBaseline[key];
          }
          state.conflicts.delete(group);
        } else {
          state.conflicts.add(group);
        }
      }
    }
    state.remote = currentBaseline;
  }
  useEffect(() => {
    const activeState = stateRef.current;
    mounted.current = true;
    return () => { mounted.current = false; activeState.generation++; activeState.pending = null; };
  }, []);

  const owner = ownerOf(props);
  const generation = state.generation;
  const version = state.version;
  const scopeCurrent = () => mounted.current && state.generation === generation && state.version === version &&
    latest.current.open && latest.current.authorized && !latest.current.authLoading;
  const editable = (retry = false) => scopeCurrent() && state.pending === null && !latest.current.saving && !latest.current.blockedReason && (retry || !latest.current.closeBlocked);
  const conflict = Boolean(props.externalConflict) || (owner ? state.conflicts.size > 0 : state.conflicts.has('name'));
  const busy = state.pending !== null || Boolean(props.saving);
  const disabled = busy || Boolean(props.blockedReason);
  const fieldsDisabled = disabled || Boolean(props.closeBlocked);
  const shrink = owner && (state.draft.startDate > props.room.startDate || state.draft.endDate < props.room.endDate);

  function revalidateDisplayed() {
    const next = fieldErrors(state.draft, latest.current);
    for (const key of Object.keys(state.errors) as Array<keyof DateSettingsErrors>) {
      if (next[key]) {state.errors[key] = next[key];}
      else {delete state.errors[key];}
    }
  }
  revalidateDisplayed();
  function edit(patch: Partial<DateSettingsDraft>) {
    if (!editable()) {return;}
    state.version++;
    state.review = null; state.consent = null; state.previewUnavailable = false;
    state.draft = { ...state.draft, ...patch };
    state.failed = false;
    revalidateDisplayed();
    redraw();
  }
  function close(next: boolean) {
    if (next || !scopeCurrent() || state.pending !== null || latest.current.saving || latest.current.closeBlocked) {return;}
    state.generation++;
    state.version++;
    state.review = null; state.consent = null; state.previewUnavailable = false;
    state.draft = { ...authoritative(latest.current) };
    state.errors = {};
    state.conflicts.clear();
    state.failed = false;
    latest.current.onOpenChange(false);
    redraw();
  }
  function resolveGroup(group: Group, keep: boolean) {
    if (!editable() || !state.conflicts.has(group)) {return;}
    state.version++; state.review = null; state.consent = null; state.previewUnavailable = false;
    for (const key of groupKeys[group]) {
      state.baseline[key] = state.remote[key];
      if (!keep) {state.draft[key] = state.remote[key];}
    }
    state.conflicts.delete(group); state.errors = {}; state.failed = false; redraw();
  }
  const review = state.review;
  function reviewDates() {
    if (!editable() || conflict || !shrink || Object.keys(fieldErrors(state.draft, latest.current)).length) {return;}
    state.version++;
    state.review = preview(latest.current, state.draft, ++state.reviewSerial, generation, state.version);
    state.consent = null; state.previewUnavailable = !state.review; redraw();
  }
  function consentDates() {
    if (!editable() || !review || state.review !== review || review.generation !== generation || review.version !== version || review.fingerprint !== impactKey(latest.current)) {return;}
    state.version++;
    state.review = Object.freeze({ ...review, version: state.version });
    state.consent = state.review; redraw();
  }
  const approved = Boolean(state.consent && state.consent === state.review && state.consent.generation === generation && state.consent.version === version);
  function useLatest() {
    if (!editable()) {return;}
    state.version++;
    state.review = null; state.consent = null; state.previewUnavailable = false;
    latest.current.onUseLatest?.();
    state.baseline = { ...state.remote };
    state.draft = { ...state.remote };
    state.conflicts.clear();
    state.errors = {};
    state.failed = false;
    redraw();
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if ((!latest.current.closeBlocked && latest.current.rangeChanged) || !editable(true) || (!latest.current.closeBlocked && (latest.current.externalConflict || (ownerOf(latest.current) ? state.conflicts.size > 0 : state.conflicts.has('name'))))) {return;}
    // A fieldset does not disable already-portaled calendars. Require dismissal;
    // their retained onChange also passes through the synchronous edit guard.
    if (formRef.current?.querySelector('[aria-expanded="true"]')) {return;}
    const currentProps = latest.current;
    const currentOwner = ownerOf(currentProps);
    const raw = currentOwner ? state.draft : { ...authoritative(currentProps), name: state.draft.name };
    state.errors = currentProps.closeBlocked ? {} : fieldErrors(raw, currentProps);
    state.failed = false;
    if (Object.keys(state.errors).length) {
      const first = (['title', 'dates', 'timezone', 'name'] as const).find(key => state.errors[key]);
      const target = first === 'dates' ? `${id}-dates-trigger` : `${id}-${first}`;
      redraw();
      formRef.current?.querySelector<HTMLElement>(`[id="${target}"]`)?.focus();
      return;
    }
    if (((shrink && (!approved || state.consent?.fingerprint !== impactKey(currentProps))) || (currentProps.actualTrim && !currentProps.actualTrim.reviewed)) && !currentProps.closeBlocked) { redraw(); return; }
    const snapshot = Object.freeze({ ...raw, title: currentOwner ? raw.title.trim() : raw.title, name: raw.name.trim() });
    const pending = ++state.serial;
    state.pending = pending; // Acquired before callback/await, not React rendering.
    const isCurrent = () => scopeCurrent() && state.pending === pending;
    const acceptAcknowledgement = (patch: Readonly<Partial<DateSettingsDraft>>) => {
      if (!isCurrent() || !patch || typeof patch !== 'object' || Array.isArray(patch)) {return false;}
      const keys = Object.keys(patch);
      const group = groups.find(candidate => keys.length === groupKeys[candidate].length &&
        groupKeys[candidate].every(key => Object.hasOwn(patch, key)));
      if (!group || (group !== 'name' && !currentOwner)) {return false;}
      if (keys.some(key => typeof patch[key as keyof DateSettingsDraft] !== 'string')) {return false;}
      const expected = { ...state.remote, ...patch };
      const ackErrors = validateDateSettings(expected, {
        room: { ...latest.current.room, startDate: expected.startDate },
        now: latest.current.now?.() ?? new Date(),
      });
      if ((group === 'title' && (ackErrors.title || expected.title !== expected.title.trim())) ||
          (group === 'name' && (ackErrors.name || expected.name !== expected.name.trim())) ||
          (group === 'schedule' && (ackErrors.dates || ackErrors.timezone))) {return false;}
      // Prebind the exact upcoming authoritative props, not an ignored metadata
      // generation. A different title/role/auth/session/blocked reason still revokes.
      state.contextKey = contextFor({ ...latest.current, room: { ...latest.current.room, ...patch } }, state.resetKey, expected);
      for (const key of groupKeys[group]) {
        state.baseline[key] = expected[key];
        state.draft[key] = expected[key];
      }
      state.remote = expected;
      state.conflicts.delete(group);
      return true;
    };
    const consentToken = state.consent;
    const hasReviewedShrink = (target: Readonly<DateSettingsDraft>, binding: string) => isCurrent() && Boolean(consentToken && state.consent === consentToken && state.review === consentToken && consentToken.generation === generation && consentToken.version === version && consentToken.binding === binding && consentToken.fingerprint === impactKey(latest.current) && sameGroup(consentToken.target, target, 'schedule'));
    const operation: DateSettingsOperation = Object.freeze({
      roomId: currentProps.room.id, userId: currentProps.userId, session: currentProps.session,
      generation, draftVersion: version, owner: currentOwner, isCurrent, acceptAcknowledgement, hasReviewedShrink, previewRemovedDates: consentToken?.savedRemoved ?? null,
    });
    redraw();
    try {
      await currentProps.onSubmit(snapshot, operation);
    } catch {
      if (isCurrent()) {state.failed = true;}
    } finally {
      if (isCurrent()) { state.pending = null; redraw(); }
    }
  }

  if (!props.authorized || props.authLoading) {return null;}
  const draft = state.draft;
  const today = todayInTimezone(draft.timezone, props.now?.() ?? new Date()) ?? '';
  const minDate = today && props.room.startDate < today ? props.room.startDate : today;
  const errorMessage = (field: keyof DateSettingsErrors) => state.errors[field] ? t(
    field === 'dates' ? state.errors.dates === 'past' ? 'dateSettings.pastDates' : 'dateSettings.datesError' : `dateSettings.${field}Error`,
  ) : undefined;
  const error = (field: keyof DateSettingsErrors) => errorMessage(field) ?
    <p className="wwm-date-settings-error" id={`${id}-${field}-error`} role="alert">{errorMessage(field)}</p> : null;
  return <Dialog open={props.open} onOpenChange={close}>
    <DialogContent className="wwm-date-settings" mobilePresentation="modal" closeLabel={t('dateSettings.close')} showCloseButton={!busy}>
      <DialogHeader>
        <DialogTitle>{t('dateSettings.title')}</DialogTitle>
        <DialogDescription>{t(owner ? 'dateSettings.description' : 'dateSettings.memberDescription')}</DialogDescription>
      </DialogHeader>
      <form ref={formRef} noValidate onSubmit={submit} className="wwm-date-settings-form" aria-busy={busy}>
        <div className="wwm-date-settings-body">
          <fieldset disabled={fieldsDisabled} className="wwm-date-settings-fields">
            {owner && <>
              <div className="wwm-date-settings-field">
                <RequiredFieldLabel required htmlFor={`${id}-title`}>{t('dateSettings.meetingName')}</RequiredFieldLabel>
                <div className="wwm-date-settings-control">
                  <Input id={`${id}-title`} name="title" required maxLength={100} value={draft.title} onChange={event => edit({ title: event.target.value })} aria-invalid={Boolean(state.errors.title)} aria-describedby={state.errors.title ? `${id}-title-error` : undefined} />
                  {error('title')}
                </div>
              </div>
              <div className="wwm-date-settings-control" onPointerDownCapture={redraw} onFocusCapture={redraw} onKeyDownCapture={redraw}>
                <DateRangePicker id={`${id}-dates`} label={t('dateSettings.dates')} ariaLabel={t('dateSettings.chooseDates')} start={draft.startDate} end={draft.endDate} minDate={minDate} onChange={(startDate, endDate) => edit({ startDate, endDate })} error={errorMessage('dates')} errorId={`${id}-dates-error`} />
                {error('dates')}
              </div>
              <div className="wwm-date-settings-field">
                <RequiredFieldLabel required htmlFor={`${id}-timezone`}>{t('dateSettings.timezone')}</RequiredFieldLabel>
                <div className="wwm-date-settings-control">
                  <TimezoneCombobox id={`${id}-timezone`} required disabled={fieldsDisabled} value={draft.timezone} referenceDate={draft.startDate} onChange={timezone => edit({ timezone })} aria-labelledby={`${id}-timezone-label`} aria-describedby={state.errors.timezone ? `${id}-timezone-error` : undefined} error={errorMessage('timezone')} />
                  {error('timezone')}
                </div>
              </div>
            </>}
            <div className="wwm-date-settings-field">
              <RequiredFieldLabel required htmlFor={`${id}-name`}>{t('dateSettings.yourName')}</RequiredFieldLabel>
              <div className="wwm-date-settings-control">
                <Input id={`${id}-name`} name="name" required maxLength={50} value={draft.name} onChange={event => edit({ name: event.target.value })} aria-invalid={Boolean(state.errors.name)} aria-describedby={state.errors.name ? `${id}-name-error` : undefined} />
                {error('name')}
              </div>
            </div>
          </fieldset>
          {props.externalConflict && <div className="wwm-date-settings-notice" role="alert">
            <p>{t('dateSettings.conflict')}</p>
            <Button type="button" variant="outline" disabled={disabled} onClick={useLatest}>{t('dateSettings.useLatest')}</Button>
          </div>}
          {groups.filter(group => state.conflicts.has(group) && (owner || group === 'name')).map(group => <div className="wwm-date-settings-notice" role="alert" key={group} data-conflict-group={group}>
            <p>{t(`dateSettings.${group}Conflict`)}</p>
            <div className="wwm-date-settings-actions">
              <Button type="button" variant="outline" disabled={disabled} onClick={() => resolveGroup(group, false)}>{t('dateSettings.useLatest')}</Button>
              <Button type="button" variant="outline" disabled={disabled} onClick={() => resolveGroup(group, true)}>{t('dateSettings.keepChanges')}</Button>
            </div>
          </div>)}
          {shrink && !props.closeBlocked && <div className="wwm-date-settings-notice" role="status">
            <p>{t('dateSettings.shrinkWarning')}</p>
            <Button type="button" variant="outline" disabled={disabled || conflict} onClick={reviewDates}>{t('dateSettings.reviewDates')}</Button>
            {state.previewUnavailable && <p role="alert">{t('dateSettings.previewUnavailable')}</p>}
            {review && <div className="wwm-date-settings-impact">
              <p data-saved-removals={review.savedRemoved}>{t('dateSettings.savedRemovals')}: {review.savedRemoved}</p>
              <p data-affected-people={review.removedByUser.length}>{t('dateSettings.affectedPeople')}: {review.removedByUser.length}</p>
              <ul>{review.removedByUser.map(value => <li key={value.userId}>{value.name}: {value.dates.map(date => date.replaceAll('-', '.')).join(', ')}</li>)}</ul>
              <p data-own-removals={review.ownRemoved.length}>{t('dateSettings.ownRemovals')}: {review.ownRemoved.map(date => date.replaceAll('-', '.')).join(', ') || t('dateSettings.none')}</p>
              {review.rosterUnavailable && <p>{t('dateSettings.rosterUnavailable')}</p>}
              <p>{t('dateSettings.confirmedUnchanged')}</p>
              <Button type="button" variant="outline" disabled={disabled || approved} onClick={consentDates}>{t('dateSettings.consent')}</Button>
            </div>}
          </div>}
          {owner && draft.timezone !== state.baseline.timezone && <p className="wwm-date-settings-notice">{t('dateSettings.timezoneWarning')} {t('dateSettings.confirmedUnchanged')}</p>}
          {props.actualTrim && <div className="wwm-date-settings-notice" role="status">
            <p data-actual-removals={props.actualTrim.removedDates}>{t('dateSettings.actualRemovals')}: {props.actualTrim.removedDates}</p>
            {props.actualTrim.previewRemovedDates !== null && props.actualTrim.previewRemovedDates !== props.actualTrim.removedDates && <p>{t('dateSettings.trimMismatch')}</p>}
            {props.rangeChanged && <>
              <p>{t('dateSettings.actualOwnRemoved')}: {props.actualTrim.ownRemovedDates.map(date => date.replaceAll('-', '.')).join(', ') || t('dateSettings.none')}</p>
              <p>{t('dateSettings.remainingOwn')}: {props.actualTrim.remainingOwnDates.map(date => date.replaceAll('-', '.')).join(', ') || t('dateSettings.none')}</p>
            </>}
            {!props.actualTrim.reviewed && <Button type="button" disabled={busy || props.closeBlocked} onClick={() => { if (scopeCurrent() && !busy && !latest.current.closeBlocked) { latest.current.onReviewRange?.(); } }}>{t('dateSettings.actualReviewed')}</Button>}
          </div>}
          {props.rangeChanged && !props.actualTrim && <div className="wwm-date-settings-notice" role="status"><p>{t('dateRoom.rangeChanged')}</p><Button type="button" disabled={busy || props.closeBlocked} onClick={() => { if (scopeCurrent() && !busy && !latest.current.closeBlocked) { latest.current.onReviewRange?.(); } }}>{t('dateRoom.reviewed')}</Button></div>}
          {props.blockedReason && <p className="wwm-date-settings-notice" role="status">{props.blockedReason}</p>}
          {(props.submitError || state.failed) && <p className="wwm-date-settings-error" role="alert">{props.submitError || t('dateSettings.failed')}</p>}
        </div>
        <DialogFooter className="wwm-date-settings-footer">
          <Button type="button" variant="outline" disabled={busy || props.closeBlocked} onClick={() => close(false)}>{t('dateSettings.cancel')}</Button>
          <Button type="submit" disabled={Boolean(disabled || (!props.closeBlocked && (conflict || (shrink && !approved) || props.rangeChanged || (props.actualTrim && !props.actualTrim.reviewed))))}>{t(busy ? 'dateSettings.saving' : (props.submitError || state.failed) ? 'common.retry' : 'dateSettings.save')}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
