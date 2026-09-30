-- Confirmed-meeting edits (revision >= 2), invitation resend, and owner room rename.
-- Requires 20260930000200_wwm_confirmation.sql and 20260930000300_wwm_calendar_private.sql.
--
-- Model: public.wwm_confirmations keeps ONE row per room describing the meeting Google last
-- verifiably holds (status stays 'confirmed' through an edit, so members never see a
-- half-applied edit). Every edit is a row in public.wwm_confirmation_revisions:
--   pending/reconciling -> confirmed (row copied into wwm_confirmations, revision bumped)
--                       -> reverted  (Google definitely rejected; wwm_confirmations untouched)
-- The current confirmed revision is also kept there, so the table is the full history.
-- The Google event is the SAME deterministic event created by revision 1 (google_event_id
-- never changes); edits patch it with sendUpdates=all.
-- No table grants: snapshots and addresses stay private. Owner RPCs are security definer with
-- owner checks; finalizers are reachable only by wwm_calendar_runtime.
begin;

-- 1. Allow later revisions on the confirmed row (was CHECK (revision = 1)).
do $$
declare c record;
begin
  for c in select con.conname from pg_constraint con
    where con.conrelid='public.wwm_confirmations'::regclass and con.contype='c'
      and pg_get_constraintdef(con.oid) ~ 'revision\s*=\s*1\)'
  loop execute format('alter table public.wwm_confirmations drop constraint %I',c.conname); end loop;
end $$;
alter table public.wwm_confirmations drop constraint if exists wwm_confirmations_revision_min;
alter table public.wwm_confirmations add constraint wwm_confirmations_revision_min check (revision >= 1);
-- Resend rate limit (server-side, once per minute per room) and the last verified resend.
alter table public.wwm_confirmations add column if not exists resend_reserved_at timestamptz;
alter table public.wwm_confirmations add column if not exists last_resent_at timestamptz;

-- 2. Revision history + the single open edit per room.
create table if not exists public.wwm_confirmation_revisions (
  room_id uuid not null references public.wwm_confirmations(room_id) on delete cascade,
  revision integer not null check (revision >= 1),
  base_revision integer check (base_revision is null or base_revision = revision - 1),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  title text not null check (char_length(btrim(title)) between 1 and 100),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  timezone text not null,
  attendee_snapshot jsonb not null check (jsonb_typeof(attendee_snapshot) = 'array'),
  excluded_snapshot jsonb not null check (jsonb_typeof(excluded_snapshot) = 'array'),
  status text not null check (status in ('pending','reconciling','confirmed','reverted')),
  google_event_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, revision)
);
create unique index if not exists wwm_confirmation_revisions_one_open
  on public.wwm_confirmation_revisions(room_id) where status in ('pending','reconciling');
revoke all on public.wwm_confirmation_revisions from public,anon,authenticated;
alter table public.wwm_confirmation_revisions enable row level security;

-- 3. Shared claim validation (same rules as wwm_reserve_confirmation) for the edit RPC.
-- Caller must hold the room row lock. Returns the private attendee/excluded snapshots.
create or replace function wwm_private.confirmation_claim(
  r public.wwm_rooms,p_title text,p_starts_at timestamptz,p_ends_at timestamptz,
  p_recipients uuid[],p_excluded uuid[],p_optional uuid[],
  out attendee jsonb,out excluded jsonb,out owner_email text
) language plpgsql stable security definer set search_path = '' as $$
declare expected_ids uuid[]; chosen uuid[]; omitted uuid[];
begin
  if p_title is null or char_length(btrim(p_title)) not between 1 and 100
     or p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at
     or p_ends_at > p_starts_at + interval '24 hours'
     or (p_starts_at at time zone r.timezone)::date not between r.start_date and r.end_date
     or (p_starts_at at time zone r.timezone)::time < r.start_time
     or not (
       ((p_ends_at at time zone r.timezone)::date = (p_starts_at at time zone r.timezone)::date
        and (p_ends_at at time zone r.timezone)::time > (p_starts_at at time zone r.timezone)::time
        and (p_ends_at at time zone r.timezone)::time <= r.end_time)
       or (r.end_time = time '24:00'
        and (p_ends_at at time zone r.timezone)::date = (p_starts_at at time zone r.timezone)::date + 1
        and (p_ends_at at time zone r.timezone)::time = time '00:00')
     )
     or extract(minute from (p_starts_at at time zone r.timezone))::int % 30 <> 0
     or extract(minute from (p_ends_at at time zone r.timezone))::int % 30 <> 0
     or extract(second from (p_starts_at at time zone r.timezone)) <> 0
     or extract(second from (p_ends_at at time zone r.timezone)) <> 0
  then raise exception 'Invalid confirmation interval or claim' using errcode='22023'; end if;
  select array_agg(m.user_id order by m.user_id) into expected_ids
    from public.wwm_members m where m.room_id=r.id;
  select array_agg(x order by x) into chosen from unnest(p_recipients) x;
  select array_agg(x order by x) into omitted from unnest(p_excluded) x;
  if expected_ids is null or p_recipients is null or p_excluded is null or p_optional is null
     or chosen is null or cardinality(chosen) <> cardinality(p_recipients)
     or coalesce(cardinality(omitted),0) <> cardinality(p_excluded)
     or cardinality(p_recipients) + cardinality(p_excluded) <> cardinality(expected_ids)
     or exists (select 1 from unnest(p_recipients || p_excluded || p_optional) x where x is null)
     or (select count(distinct x) from unnest(p_recipients || p_excluded) x)
        <> cardinality(expected_ids)
     or (select array_agg(distinct x order by x) from unnest(p_recipients || p_excluded) x)
        is distinct from expected_ids
     or (select count(distinct x) from unnest(p_optional) x) <> cardinality(p_optional)
     or exists (select 1 from unnest(p_optional) x where not (x = any(p_recipients)))
  then raise exception 'Recipients and exclusions must partition current members' using errcode='22023'; end if;
  select jsonb_agg(jsonb_build_object('userId',m.user_id,'email',btrim(u.email),'optional',m.user_id=any(p_optional)) order by m.user_id)
    into attendee from public.wwm_members m join auth.users u on u.id=m.user_id
    where m.room_id=r.id and m.user_id=any(p_recipients);
  if jsonb_array_length(coalesce(attendee,'[]'::jsonb)) <> cardinality(chosen)
     or exists (select 1 from public.wwm_members m join auth.users u on u.id=m.user_id
       where m.room_id=r.id and m.user_id=any(p_recipients)
       and (u.email is null or btrim(u.email) !~ '^[^[:space:]@[:cntrl:]]+@[^[:space:]@.[:cntrl:]]+(\.[^[:space:]@.[:cntrl:]]+)+$'))
     or (select count(distinct lower(btrim(u.email))) from public.wwm_members m
         join auth.users u on u.id=m.user_id where m.room_id=r.id
         and m.user_id=any(p_recipients)) <> cardinality(chosen)
  then raise exception 'Invalid or duplicate recipient email' using errcode='22023'; end if;
  select btrim(u.email) into owner_email from auth.users u where u.id=r.owner_id;
  if owner_email is null or owner_email !~ '^[^[:space:]@[:cntrl:]]+@[^[:space:]@.[:cntrl:]]+(\.[^[:space:]@.[:cntrl:]]+)+$'
  then raise exception 'Organizer email unavailable' using errcode='22023'; end if;
  select coalesce(jsonb_agg(x order by x),'[]'::jsonb) into excluded from unnest(p_excluded) x;
end $$;
revoke all on function wwm_private.confirmation_claim(public.wwm_rooms,text,timestamptz,timestamptz,uuid[],uuid[],uuid[]) from public,anon,authenticated;

-- 4. Owner RPC: reserve an edit of the confirmed meeting. Like wwm_reserve_confirmation this is a
-- durable claim, not authorization to call Google; the trusted server reconciles by read-back.
-- Returns: reserved_reconcile_required | reconcile (same open edit) | existing (already applied)
--          | conflict (stale base or another open edit) | not_confirmed.
create or replace function public.wwm_reserve_confirmation_update(
  p_room_id uuid,p_revision integer,p_payload_hash text,
  p_title text,p_starts_at timestamptz,p_ends_at timestamptz,
  p_recipients uuid[],p_excluded uuid[],p_optional uuid[]
) returns text language plpgsql volatile security definer set search_path = '' as $$
declare r public.wwm_rooms; c public.wwm_confirmations; open_edit public.wwm_confirmation_revisions;
  claim record;
begin
  if auth.uid() is null or not wwm_private.is_google() then
    raise exception 'Google meeting owner required' using errcode='42501';
  end if;
  select * into r from public.wwm_rooms where id=p_room_id for update;
  if not found or r.owner_id <> auth.uid() then
    raise exception 'Meeting owner required' using errcode='42501';
  end if;
  perform 1 from public.wwm_members m where m.room_id=p_room_id for share;
  perform 1 from auth.users u join public.wwm_members m on m.user_id=u.id
    where m.room_id=p_room_id for share of u;
  if p_revision is null or p_revision < 2 or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'Invalid confirmation interval or claim' using errcode='22023'; end if;
  select * into claim from wwm_private.confirmation_claim(r,p_title,p_starts_at,p_ends_at,p_recipients,p_excluded,p_optional);
  select * into c from public.wwm_confirmations where room_id=p_room_id for update;
  if not found or c.status <> 'confirmed' or c.organizer_id <> auth.uid() then return 'not_confirmed'; end if;
  -- Retried edit that already applied.
  if c.revision = p_revision then
    return case when c.payload_hash = p_payload_hash then 'existing' else 'conflict' end;
  end if;
  select * into open_edit from public.wwm_confirmation_revisions
    where room_id=p_room_id and status in ('pending','reconciling');
  if found then
    if open_edit.revision = p_revision and open_edit.payload_hash = p_payload_hash
       and open_edit.title = btrim(p_title) and open_edit.starts_at = p_starts_at
       and open_edit.ends_at = p_ends_at and open_edit.attendee_snapshot = claim.attendee
       and open_edit.excluded_snapshot = claim.excluded
    then return 'reconcile'; end if;
    return 'conflict';
  end if;
  if p_revision <> c.revision + 1 then return 'conflict'; end if;
  -- Keep the currently confirmed state as history (revision 1 rows predate this table).
  insert into public.wwm_confirmation_revisions(room_id,revision,base_revision,payload_hash,title,
    starts_at,ends_at,timezone,attendee_snapshot,excluded_snapshot,status,google_event_url)
  values(c.room_id,c.revision,case when c.revision>1 then c.revision-1 end,c.payload_hash,c.title,
    c.starts_at,c.ends_at,c.timezone,c.attendee_snapshot,c.excluded_snapshot,'confirmed',c.google_event_url)
  on conflict (room_id,revision) do nothing;
  -- A previously reverted attempt at this revision is replaced by the new proposal.
  insert into public.wwm_confirmation_revisions(room_id,revision,base_revision,payload_hash,title,
    starts_at,ends_at,timezone,attendee_snapshot,excluded_snapshot,status)
  values(p_room_id,p_revision,c.revision,p_payload_hash,btrim(p_title),p_starts_at,p_ends_at,
    r.timezone,claim.attendee,claim.excluded,'pending')
  on conflict (room_id,revision) do update set payload_hash=excluded.payload_hash,title=excluded.title,
    starts_at=excluded.starts_at,ends_at=excluded.ends_at,timezone=excluded.timezone,
    attendee_snapshot=excluded.attendee_snapshot,excluded_snapshot=excluded.excluded_snapshot,
    status='pending',google_event_url=null,created_at=now(),updated_at=now()
    where public.wwm_confirmation_revisions.status='reverted';
  if not found then return 'conflict'; end if;
  return 'reserved_reconcile_required';
end $$;
revoke all on function public.wwm_reserve_confirmation_update(uuid,integer,text,text,timestamptz,timestamptz,uuid[],uuid[],uuid[]) from public,anon;
grant execute on function public.wwm_reserve_confirmation_update(uuid,integer,text,text,timestamptz,timestamptz,uuid[],uuid[],uuid[]) to authenticated;

-- 5. Owner-only review data for editing: ids only (emails come from wwm_confirmation_attendees).
-- Revision 1 snapshots predate optional flags, so their optional list is empty.
create or replace function public.wwm_confirmation_owner_detail(p_room_id uuid)
returns table(revision integer,recipient_ids uuid[],excluded_ids uuid[],optional_ids uuid[],
  open_revision integer,open_status text,open_title text,open_starts_at timestamptz,open_ends_at timestamptz,
  open_recipient_ids uuid[],open_excluded_ids uuid[],open_optional_ids uuid[],last_resent_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() or not exists (
    select 1 from public.wwm_rooms r where r.id=p_room_id and r.owner_id=auth.uid()
  ) then raise exception 'Meeting owner required' using errcode='42501'; end if;
  return query
    select c.revision,
      array(select (a->>'userId')::uuid from jsonb_array_elements(c.attendee_snapshot) a order by 1),
      array(select x::uuid from jsonb_array_elements_text(c.excluded_snapshot) x order by 1),
      array(select (a->>'userId')::uuid from jsonb_array_elements(c.attendee_snapshot) a where (a->>'optional')::boolean is true order by 1),
      o.revision,o.status,o.title,o.starts_at,o.ends_at,
      case when o.revision is null then null else array(select (a->>'userId')::uuid from jsonb_array_elements(o.attendee_snapshot) a order by 1) end,
      case when o.revision is null then null else array(select x::uuid from jsonb_array_elements_text(o.excluded_snapshot) x order by 1) end,
      case when o.revision is null then null else array(select (a->>'userId')::uuid from jsonb_array_elements(o.attendee_snapshot) a where (a->>'optional')::boolean is true order by 1) end,
      c.last_resent_at
    from public.wwm_confirmations c
    left join public.wwm_confirmation_revisions o on o.room_id=c.room_id and o.status in ('pending','reconciling')
    where c.room_id=p_room_id and c.organizer_id=auth.uid();
end $$;
revoke all on function public.wwm_confirmation_owner_detail(uuid) from public,anon;
grant execute on function public.wwm_confirmation_owner_detail(uuid) to authenticated;

-- 6. Owner RPC: claim one resend per minute per room. Returns reserved | too_soon | not_confirmed.
create or replace function public.wwm_reserve_resend(p_room_id uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare c public.wwm_confirmations;
begin
  if auth.uid() is null or not wwm_private.is_google() or not exists (
    select 1 from public.wwm_rooms r where r.id=p_room_id and r.owner_id=auth.uid()
  ) then raise exception 'Meeting owner required' using errcode='42501'; end if;
  select * into c from public.wwm_confirmations where room_id=p_room_id for update;
  if not found or c.status <> 'confirmed' or c.organizer_id <> auth.uid()
     or exists (select 1 from public.wwm_confirmation_revisions o where o.room_id=p_room_id and o.status in ('pending','reconciling'))
  then return 'not_confirmed'; end if;
  if c.resend_reserved_at is not null and c.resend_reserved_at > now() - interval '1 minute' then return 'too_soon'; end if;
  update public.wwm_confirmations set resend_reserved_at=now() where room_id=p_room_id;
  return 'reserved';
end $$;
revoke all on function public.wwm_reserve_resend(uuid) from public,anon;
grant execute on function public.wwm_reserve_resend(uuid) to authenticated;

-- 7. Owner RPC: rename the room (1-100 chars after trim, no control characters).
create or replace function public.wwm_rename_room(p_room_id uuid,p_title text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare t text := btrim(p_title);
begin
  if auth.uid() is null or not wwm_private.is_google() then
    raise exception 'Google meeting owner required' using errcode='42501';
  end if;
  if t is null or char_length(t) not between 1 and 100 or t ~ '[[:cntrl:]]' then
    raise exception 'Invalid meeting name' using errcode='22023';
  end if;
  update public.wwm_rooms set title=t where id=p_room_id and owner_id=auth.uid();
  if not found then raise exception 'Meeting owner required' using errcode='42501'; end if;
  return t;
end $$;
revoke all on function public.wwm_rename_room(uuid,text) from public,anon;
grant execute on function public.wwm_rename_room(uuid,text) to authenticated;

-- 8. Server-only finalizers (wwm_calendar_runtime). The server verified the owner session,
-- reserved through the RPC above and read the Google event back by its deterministic ID.
-- p_status: confirmed (read-back matches the edit) | reconciling (unknown) | reverted (Google
-- definitely rejected the edit, so the previously confirmed meeting still stands).
create or replace function wwm_calendar_private.finalize_confirmation_update(
 p_room uuid,p_organizer uuid,p_event_id text,p_revision integer,p_payload_hash text,p_status text,p_url text)
returns text language plpgsql security definer set search_path='' as $$
declare c public.wwm_confirmations; e public.wwm_confirmation_revisions;
begin
 select * into c from public.wwm_confirmations where room_id=p_room for update;
 if not found or c.organizer_id<>p_organizer or c.google_event_id<>p_event_id then
  raise exception 'Confirmation claim mismatch' using errcode='42501';
 end if;
 select * into e from public.wwm_confirmation_revisions where room_id=p_room and revision=p_revision for update;
 if not found or e.payload_hash<>p_payload_hash then raise exception 'Confirmation claim mismatch' using errcode='42501'; end if;
 if e.status='confirmed' then return 'confirmed'; end if;
 if e.status='reverted' then return 'reverted'; end if;
 if p_status='confirmed' then
  if p_url is null or p_url !~ '^https://www\.google\.com/calendar/' then raise exception 'Invalid event link' using errcode='22023'; end if;
  if c.revision<>e.base_revision then raise exception 'Confirmation claim mismatch' using errcode='42501'; end if;
  update public.wwm_confirmation_revisions set status='confirmed',google_event_url=p_url,updated_at=now()
   where room_id=p_room and revision=p_revision;
  update public.wwm_confirmations set revision=e.revision,payload_hash=e.payload_hash,title=e.title,
   starts_at=e.starts_at,ends_at=e.ends_at,timezone=e.timezone,attendee_snapshot=e.attendee_snapshot,
   excluded_snapshot=e.excluded_snapshot,status='confirmed',google_event_url=p_url,updated_at=now()
   where room_id=p_room;
  return 'confirmed';
 elsif p_status='reconciling' then
  update public.wwm_confirmation_revisions set status='reconciling',updated_at=now() where room_id=p_room and revision=p_revision;
  return 'reconciling';
 elsif p_status='reverted' then
  update public.wwm_confirmation_revisions set status='reverted',updated_at=now() where room_id=p_room and revision=p_revision;
  return 'reverted';
 end if;
 raise exception 'Invalid confirmation status' using errcode='22023';
end $$;
-- p_status: sent (Google accepted the notification patch) | failed (definite rejection: lift the rate limit).
-- Ambiguous outcomes are not finalized; the one-minute reservation simply expires.
create or replace function wwm_calendar_private.finalize_resend(p_room uuid,p_organizer uuid,p_event_id text,p_status text)
returns text language plpgsql security definer set search_path='' as $$
declare c public.wwm_confirmations;
begin
 select * into c from public.wwm_confirmations where room_id=p_room for update;
 if not found or c.organizer_id<>p_organizer or c.google_event_id<>p_event_id or c.resend_reserved_at is null then
  raise exception 'Resend claim mismatch' using errcode='42501';
 end if;
 if p_status='sent' then
  update public.wwm_confirmations set last_resent_at=now() where room_id=p_room;
  return 'sent';
 elsif p_status='failed' then
  update public.wwm_confirmations set resend_reserved_at=null where room_id=p_room;
  return 'failed';
 end if;
 raise exception 'Invalid resend status' using errcode='22023';
end $$;
revoke all on function wwm_calendar_private.finalize_confirmation_update(uuid,uuid,text,integer,text,text,text),
  wwm_calendar_private.finalize_resend(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function wwm_calendar_private.finalize_confirmation_update(uuid,uuid,text,integer,text,text,text),
  wwm_calendar_private.finalize_resend(uuid,uuid,text,text) to wwm_calendar_runtime;
commit;
