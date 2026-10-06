'use client';
import { useEffect, useRef, useState } from 'react';
import { useCraftAccount } from '@/app/craft/CraftAccount';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { DateAvailabilityCalendar } from './DateAvailabilityCalendar';
import { Notice } from './Notice';
import { useWwmCopy } from './i18n/WwmI18nProvider';
import { connectGoogleCalendar } from './api';
import {
  getDateConfirmation,
  confirmDateMeetingRoute,
  updateDateMeetingRoute,
  reconcileDateMeetingRoute,
  resendDateMeetingRoute,
  ApiError,
  type DateConfirmationInput,
  type DateConfirmationResult,
} from './date-confirmation-api';
import {
  normalizeDateReview,
  saveDateConfirmReturn,
  buildDateProposal,
  eligibleDateEmail,
  type DateReview,
} from './date-confirm-ui.mjs';
import type { DateRoom, DateResponse } from './date-contracts';
import './date-confirm.css';
export function DateConfirmTab({ room, responses }: { room: DateRoom; responses: DateResponse[] }) {
  const { user, loading } = useCraftAccount();
  const { t } = useWwmCopy();
  const [privateData, updateData] = useState<{ key: string; value: DateReview } | null>(null);
  const identityKey = `${room.id}:${user?.id || ''}:${room.role}:${room.ownerId}`;
  const data = privateData?.key === identityKey ? privateData.value : null;
  function setData(value: DateReview | null) {
    updateData(value ? { key: identityKey, value } : null);
  }
  const [date, setDate] = useState<string>();
  const [title, setTitle] = useState(room.title);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [optional, setOptional] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState(false);
  const [reviewedState, updateReviewed] = useState<DateConfirmationInput | null>(null);
  const reviewedBody = useRef<DateConfirmationInput | null>(null);
  const reviewedSchedule = useRef('');
  const draft = useRef({
    date: '',
    title: room.title,
    recipients: [] as string[],
    optional: [] as string[],
  });
  const draftGeneration = useRef(0);
  const reviewedGeneration = useRef<number | null>(null);
  const renderDraftGeneration = draftGeneration.current;
  function changeDraft(value: Partial<typeof draft.current>) {
    draftGeneration.current++;
    draft.current = { ...draft.current, ...value };
    reviewedGeneration.current = null;
    reviewedBody.current = null;
    reviewedSchedule.current = '';
    updateReviewed(null);
  }
  const scheduleKey = `${identityKey}:${loading}:${room.startDate}:${room.endDate}:${room.timezone}`;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uncertain, updateUncertain] = useState(false);
  const uncertainty = useRef(false);
  function setUncertain(value: boolean) {
    uncertainty.current = value;
    updateUncertain(value);
  }
  const [notice, setNotice] = useState('');
  const [reconnect, setReconnect] = useState(false);
  const guard = useRef(false),
    mounted = useRef(false),
    epoch = useRef(0);
  const operation = useRef<'initial' | 'update'>('initial');
  const scope = useRef<AbortController | null>(null);
  const generation = useRef(0);
  function invalidateOperations() {
    epoch.current++;
    generation.current++;
  }
  const binding = useRef({ room, userId: user?.id, loading, identityKey, scheduleKey, data });
  if (binding.current.identityKey !== identityKey) {
    generation.current++;
    epoch.current++;
    scope.current?.abort();
    guard.current = false;
    uncertainty.current = false;
    operation.current = 'initial';
  }
  if (binding.current.scheduleKey !== scheduleKey || binding.current.data !== data) {
    reviewedBody.current = null;
    reviewedSchedule.current = '';
  }
  binding.current = { room, userId: user?.id, loading, identityKey, scheduleKey, data };
  const reviewed =
    reviewedSchedule.current === scheduleKey &&
    reviewedGeneration.current === draftGeneration.current
      ? reviewedState
      : null;
  function currentIdentity() {
    const latest = binding.current;
    return (
      mounted.current &&
      latest.identityKey === identityKey &&
      !latest.loading &&
      Boolean(latest.userId) &&
      (latest.room.role !== 'ADMIN' || latest.room.ownerId === latest.userId)
    );
  }
  function currentAction() {
    return (
      currentIdentity() &&
      binding.current.scheduleKey === scheduleKey &&
      binding.current.data === data &&
      Boolean(data) &&
      binding.current.room.role === 'ADMIN'
    );
  }
  function currentDraft() {
    return currentAction() && renderDraftGeneration === draftGeneration.current;
  }
  function setReviewed(value: DateConfirmationInput | null, version = renderDraftGeneration) {
    if (value && (!currentAction() || version !== draftGeneration.current)) {
      return;
    }
    reviewedGeneration.current = value ? version : null;
    reviewedSchedule.current = value ? scheduleKey : '';
    reviewedBody.current = value;
    updateReviewed(value);
  }
  const authorized =
    !loading && Boolean(user) && (room.role !== 'ADMIN' || room.ownerId === user?.id);
  async function read(signal?: AbortSignal) {
    if (!currentIdentity()) {
      return null;
    }
    const serial = ++epoch.current;
    const readGeneration = generation.current;
    const userId = user?.id;
    try {
      const value = normalizeDateReview(
        await getDateConfirmation(room.id, signal),
        room,
        userId || '',
      );
      if (
        !currentIdentity() ||
        signal?.aborted ||
        serial !== epoch.current ||
        binding.current.userId !== userId ||
        binding.current.room.id !== room.id ||
        readGeneration !== generation.current
      ) {
        return null;
      }
      setData(value);
      return value;
    } catch {
      if (
        currentIdentity() &&
        readGeneration === generation.current &&
        !signal?.aborted &&
        serial === epoch.current
      ) {
        setNotice('loadFailed');
      }
      return null;
    }
  }
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    scope.current = controller;
    setData(null);
    setBusy(false);
    setUncertain(false);
    setNotice('');
    setReconnect(false);
    setEditing(false);
    changeDraft({ date: '', title: room.title, recipients: [], optional: [] });
    setTitle(room.title);
    setRecipients([]);
    setOptional([]);
    setReviewed(null);
    setReviewing(false);
    setDate(undefined);
    if (authorized) {
      void read(controller.signal);
    }
    return () => {
      mounted.current = false;
      controller.abort();
      invalidateOperations();
    };
    // Identity-bound private read; mutable range does not erase historical snapshots.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identityKey, authorized]);
  const pending = data?.owner?.pending;
  const storedUncertain =
    Boolean(pending) || (data?.status != null && data.status.status !== 'confirmed');
  const frozen = busy || uncertain || storedUncertain;
  const attendees = data?.review?.attendees || [];
  const proposed = () =>
    buildDateProposal(room, attendees, {
      date: draft.current.date,
      title: draft.current.title,
      revision: data?.owner ? data.owner.root.valid.revision + 1 : 1,
      recipients: draft.current.recipients,
      optional: draft.current.optional,
    });
  function changeRecipients(id: string, include: boolean) {
    if (!currentDraft() || guard.current || frozen) {
      return;
    }
    changeDraft({
      recipients: include ? [...recipients, id] : recipients.filter((value) => value !== id),
      optional: include ? optional : optional.filter((value) => value !== id),
    });
    setRecipients(draft.current.recipients);
    if (!include) {
      setOptional(optional.filter((value) => value !== id));
    }
    setReviewed(null);
    setNotice('reviewAgain');
  }
  async function review() {
    if (!currentDraft() || guard.current || frozen || !date) {
      return;
    }
    if (!reviewing) {
      const eligible = attendees.filter((person) => eligibleDateEmail(person.email));
      // Duplicate addresses cannot form an authoritative invitation partition.
      const seen = new Set<string>();
      const defaults = eligible
        .filter((person) => {
          const address = (person.email || '').toLowerCase();
          if (seen.has(address)) {
            return false;
          }
          seen.add(address);
          return true;
        })
        .map((person) => person.userId);
      changeDraft({ recipients: defaults, optional: [] });
      const reviewVersion = draftGeneration.current;
      setRecipients(defaults);
      setOptional([]);
      setReviewing(true);
      try {
        setReviewed(
          buildDateProposal(room, attendees, {
            date,
            title,
            revision: data?.owner ? data.owner.root.valid.revision + 1 : 1,
            recipients: defaults,
            optional: [],
          }),
          reviewVersion,
        );
        setNotice('');
      } catch {
        setReviewed(null);
        setNotice('invalid');
      }
      return;
    }
    try {
      setReviewed(proposed());
      setNotice('');
    } catch {
      setNotice('invalid');
    }
  }
  async function mutate(kind: 'send' | 'check' | 'resend') {
    if (!currentAction() || guard.current || !authorized || room.role !== 'ADMIN') {
      return;
    }
    let body: DateConfirmationInput | null = null;
    if (kind === 'send') {
      if (
        !currentDraft() ||
        reviewedGeneration.current !== draftGeneration.current ||
        frozen ||
        uncertainty.current ||
        !reviewing
      ) {
        return;
      }
      try {
        body = proposed();
      } catch {
        setNotice('invalid');
        return;
      }
      // The first review opens the visible partition; edits require an explicit re-review.
      if (reviewed && JSON.stringify(body) !== JSON.stringify(reviewed)) {
        setReviewed(null);
        return;
      }
      if (reviewedSchedule.current !== scheduleKey) {
        setReviewed(null);
        setNotice('reviewAgain');
        return;
      }
      if (!reviewedBody.current) {
        return;
      }
      body = {
        ...reviewedBody.current,
        recipients: [...reviewedBody.current.recipients],
        excluded: [...(reviewedBody.current.excluded || [])],
        optional: [...(reviewedBody.current.optional || [])],
      };
      operation.current = data?.owner ? 'update' : 'initial';
    }
    if (kind === 'resend' && (frozen || data?.status?.status !== 'confirmed')) {
      return;
    }
    guard.current = true;
    setBusy(true);
    setReconnect(false);
    const operationGeneration = ++generation.current;
    const isCurrentOperation = () =>
      currentIdentity() && generation.current === operationGeneration;
    try {
      let result: DateConfirmationResult;
      if (kind === 'check') {
        result = await reconcileDateMeetingRoute(room.id, pending ? 'update' : operation.current);
      } else if (kind === 'resend') {
        result = await resendDateMeetingRoute(room.id);
      } else if (body) {
        result = await (operation.current === 'update'
          ? updateDateMeetingRoute(room.id, body)
          : confirmDateMeetingRoute(room.id, body));
      } else {
        return;
      }
      if (!isCurrentOperation()) {
        return;
      }
      const known = [
        'confirmed',
        'reconciling',
        'conflict',
        'not_confirmed',
        'sent',
        'too_soon',
        'unknown',
        'failed',
      ].includes(result?.status);
      if (!known) {
        setUncertain(true);
        setNotice('unknown');
        return;
      }
      setNotice(result.status);
      if (result.status === 'confirmed') {
        setUncertain(true);
        setEditing(false);
        setReviewing(false);
        setReviewed(null);
        toast.success(t('dateConfirm.confirmed'));
        const confirmed = await read(scope.current?.signal);
        if (
          isCurrentOperation() &&
          confirmed?.status?.status === 'confirmed' &&
          !confirmed.owner?.pending
        ) {
          setUncertain(false);
        }
      } else if (result.status === 'sent' || result.status === 'too_soon') {
        setUncertain(false);
      } else if (result.status === 'failed') {
        setUncertain(false);
        setReviewed(null);
        await read(scope.current?.signal);
      } else {
        setUncertain(true);
        if (result.status === 'conflict' || result.status === 'not_confirmed') {
          const value = await read(scope.current?.signal);
          if (
            isCurrentOperation() &&
            value &&
            !value.owner?.pending &&
            (!value.status || value.status.status === 'confirmed')
          ) {
            setUncertain(false);
            setReviewing(false);
            setReviewed(null);
          }
        }
      }
    } catch (error) {
      if (!isCurrentOperation()) {
        return;
      }
      if (error instanceof ApiError && error.reconnect) {
        setReconnect(true);
        setUncertain(false);
        setNotice('reconnect');
      } else if (error instanceof ApiError && [400, 401, 403].includes(error.status)) {
        setNotice('failed');
        setReviewed(null);
      } else {
        setUncertain(true);
        setNotice('unknown');
      }
    } finally {
      if (isCurrentOperation()) {
        guard.current = false;
        setBusy(false);
      }
    }
  }
  if (!authorized) {
    return null;
  }
  const admin = room.role === 'ADMIN';
  const display = (value: string) => value.replaceAll('-', '.');
  const count = date
    ? responses.filter(
        (response) =>
          attendees.some((person) => person.userId === response.userId) &&
          response.availableDates.includes(date),
      ).length
    : null;
  return (
    <section className="wwm-date-confirm" aria-label={t('dateConfirm.heading')}>
      {notice && (
        <Notice tone={notice === 'confirmed' || notice === 'sent' ? 'info' : 'warning'}>
          {t(`dateConfirm.${notice}`)}
        </Notice>
      )}
      {!data && (
        <Button disabled={busy} onClick={() => void read(scope.current?.signal)}>
          {t('dateConfirm.reload')}
        </Button>
      )}
      {data?.status && (
        <div className="wwm-date-confirm-stored">
          <h2>{data.status.title}</h2>
          <p>
            {display(data.status.startDate)} · {t('dateConfirm.allDay')} · {data.status.timezone}
          </p>
          {data.status.url && (
            <a href={data.status.url} target="_blank" rel="noopener noreferrer">
              {t('dateConfirm.openCalendar')}
            </a>
          )}
        </div>
      )}
      {pending && (
        <div>
          <h3>{t('dateConfirm.pending')}</h3>
          <p>
            {pending.valid.title} · {display(pending.valid.date)} · {pending.valid.timezone}
          </p>
        </div>
      )}
      {admin && data && (
        <>
          {frozen && !busy && (
            <Button onClick={() => void mutate('check')}>{t('dateConfirm.check')}</Button>
          )}
          {data.status?.status === 'confirmed' && !editing && !frozen && (
            <div className="wwm-date-confirm-actions">
              <Button
                onClick={() => {
                  if (!currentDraft() || guard.current || frozen) {
                    return;
                  }
                  changeDraft({
                    date: '',
                    title: data.owner?.root.valid.title || room.title,
                    recipients: [],
                    optional: [],
                  });
                  setRecipients([]);
                  setOptional([]);
                  setEditing(true);
                  setDate(undefined);
                  setTitle(data.owner?.root.valid.title || room.title);
                  setReviewing(false);
                  setReviewed(null);
                }}
              >
                {t('dateConfirm.edit')}
              </Button>
              <Button onClick={() => void mutate('resend')}>{t('dateConfirm.resend')}</Button>
              <Button onClick={() => void read(scope.current?.signal)}>
                {t('dateConfirm.reload')}
              </Button>
            </div>
          )}
          {(!data.status || editing) && (
            <>
              <label>
                {t('dateConfirm.title')}
                <Input
                  value={title}
                  maxLength={100}
                  disabled={frozen}
                  onChange={(event) => {
                    if (!currentDraft() || guard.current || frozen) {
                      return;
                    }
                    changeDraft({ title: event.target.value });
                    setTitle(event.target.value);
                    setReviewing(false);
                    setReviewed(null);
                  }}
                />
              </label>
              <DateAvailabilityCalendar
                room={room}
                selected={[]}
                onChange={() => undefined}
                inspection={date}
                disabled={frozen}
                onInspect={(value) => {
                  if (!currentDraft() || guard.current || frozen) {
                    return;
                  }
                  changeDraft({ date: value });
                  setDate(value);
                  setReviewing(false);
                  setReviewed(null);
                }}
              />
              {date && (
                <p>
                  {display(date)} · {t('dateConfirm.allDay')} · {room.timezone} ·{' '}
                  {t('dateConfirm.available')}: {count}
                </p>
              )}
              {!reviewing && (
                <Button disabled={!date || frozen || !attendees.length} onClick={review}>
                  {t('dateConfirm.review')}
                </Button>
              )}
              {reviewing && (
                <div className="wwm-date-confirm-recipients">
                  <h3>{t('dateConfirm.recipients')}</h3>
                  {attendees.map((person) => (
                    <div key={person.userId} className="wwm-date-confirm-person">
                      <label>
                        <Checkbox
                          disabled={frozen || !eligibleDateEmail(person.email)}
                          checked={recipients.includes(person.userId)}
                          onCheckedChange={(checked) => {
                            changeRecipients(person.userId, checked === true);
                          }}
                        />
                        <span>
                          {person.displayName}
                          <small>{person.email || t('dateConfirm.emailMissing')}</small>
                        </span>
                      </label>
                      <label>
                        <Checkbox
                          disabled={frozen || !recipients.includes(person.userId)}
                          checked={optional.includes(person.userId)}
                          onCheckedChange={(checked) => {
                            if (!currentDraft() || guard.current || frozen) {
                              return;
                            }
                            changeDraft({
                              optional:
                                checked === true
                                  ? [...optional, person.userId]
                                  : optional.filter((id) => id !== person.userId),
                            });
                            setOptional(
                              checked === true
                                ? [...optional, person.userId]
                                : optional.filter((id) => id !== person.userId),
                            );
                            setReviewed(null);
                            setNotice('reviewAgain');
                          }}
                        />
                        {t('dateConfirm.optional')}
                      </label>
                    </div>
                  ))}
                  <p>
                    {t('dateConfirm.included')}: {recipients.length} · {t('dateConfirm.excluded')}:{' '}
                    {attendees.length - recipients.length}
                  </p>
                  <div className="wwm-date-confirm-actions">
                    <Button
                      disabled={frozen}
                      onClick={() => {
                        if (!currentDraft() || guard.current || frozen) {
                          return;
                        }
                        changeDraft({});
                        setReviewing(false);
                        setReviewed(null);
                      }}
                    >
                      {t('dateConfirm.back')}
                    </Button>
                    {!reviewed && (
                      <Button
                        disabled={frozen}
                        onClick={() => {
                          if (!currentDraft() || guard.current || frozen) {
                            return;
                          }
                          try {
                            setReviewed(proposed());
                            setNotice('');
                          } catch {
                            setNotice('invalid');
                          }
                        }}
                      >
                        {t('dateConfirm.review')}
                      </Button>
                    )}
                    {!uncertain && (
                      <Button
                        disabled={frozen || !recipients.length || notice === 'reviewAgain'}
                        onClick={() => mutate('send')}
                      >
                        {t('dateConfirm.send')}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
          {busy && <p role="status">{t('dateConfirm.sending')}</p>}
          {reconnect && (
            <Button
              disabled={busy}
              onClick={async () => {
                if (!currentAction() || guard.current) {
                  return;
                }
                guard.current = true;
                const reconnectGeneration = ++generation.current;
                const currentReconnect = () =>
                  currentIdentity() && generation.current === reconnectGeneration;
                try {
                  saveDateConfirmReturn(window.sessionStorage, room.id, user?.id || '');
                  await connectGoogleCalendar(
                    room.id,
                    window.location.pathname + window.location.search,
                  );
                } catch {
                  if (currentReconnect()) {
                    setNotice('reconnect');
                  }
                } finally {
                  if (currentReconnect()) {
                    guard.current = false;
                  }
                }
              }}
            >
              {t('dateConfirm.connect')}
            </Button>
          )}
        </>
      )}
      {!admin && data?.status === null && <p>{t('dateConfirm.notConfirmed')}</p>}
    </section>
  );
}
