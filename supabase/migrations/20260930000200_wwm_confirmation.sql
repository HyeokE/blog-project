-- Confirmation reservation (owner RPC) and member status. Finalization lives in wwm_calendar_private (000300).
-- No credential storage here. Reservation is one immutable confirmation per room;
-- update/cancel and a second revision require a separately approved migration.
begin;
create table public.wwm_confirmations (
  room_id uuid primary key references public.wwm_rooms(id) on delete cascade,
  revision integer not null check (revision = 1),
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  google_event_id text not null unique check (google_event_id ~ '^[0-9a-v]+$' and char_length(google_event_id) between 5 and 1024),
  organizer_id uuid not null references auth.users(id),
  organizer_email text not null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  timezone text not null,
  attendee_snapshot jsonb not null check (jsonb_typeof(attendee_snapshot) = 'array'),
  excluded_snapshot jsonb not null check (jsonb_typeof(excluded_snapshot) = 'array'),
  status text not null check (status in ('pending','reconciling','confirmed','failed')),
  google_event_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
revoke all on public.wwm_confirmations from public,anon,authenticated;
alter table public.wwm_confirmations enable row level security;
-- No direct table read or write grants: organizer addresses and snapshots are private.
-- Call through audited server adapter only after token storage and recovery exist.
create function public.wwm_confirmation_attendees(p_room_id uuid)
returns table(user_id uuid,display_name text,email text,has_availability boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() or not exists (
    select 1 from public.wwm_rooms r where r.id=p_room_id and r.owner_id=auth.uid()
  ) then raise exception 'Meeting owner required' using errcode='42501'; end if;
  return query
    select m.user_id,coalesce(nullif(btrim(a.display_name),''),'Participant'),
           nullif(btrim(u.email),'')::text,coalesce(cardinality(a.slots),0)>0
    from public.wwm_members m
    join auth.users u on u.id=m.user_id
    left join public.wwm_responses a on a.room_id=m.room_id and a.user_id=m.user_id
    where m.room_id=p_room_id
    order by m.joined_at,m.user_id;
end $$;
revoke all on function public.wwm_confirmation_attendees(uuid) from public,anon;
grant execute on function public.wwm_confirmation_attendees(uuid) to authenticated;
-- Reservation is a durable claim, NOT authorization to call Google. In particular,
-- retries (including a first reservation returned to its caller) must reconcile by
-- event ID; only a separately reviewed trusted server workflow can send/finalize.
create function public.wwm_reserve_confirmation(
  p_room_id uuid,p_revision integer,p_payload_hash text,p_google_event_id text,
  p_title text,p_starts_at timestamptz,p_ends_at timestamptz,
  p_recipients uuid[],p_excluded uuid[]
) returns text language plpgsql volatile security definer set search_path = '' as $$
declare r public.wwm_rooms; existing public.wwm_confirmations;
  expected_ids uuid[]; chosen uuid[]; omitted uuid[];
  attendee jsonb; excluded jsonb; owner_email text;
begin
  if auth.uid() is null or not wwm_private.is_google() then
    raise exception 'Google meeting owner required' using errcode='42501';
  end if;
  -- Serialize reservation and membership writers on this room row. FK insert of a
  -- new member takes KEY SHARE; UPDATE lock conflicts with it.
  select * into r from public.wwm_rooms where id=p_room_id for update;
  if not found or r.owner_id <> auth.uid() then
    raise exception 'Meeting owner required' using errcode='42501';
  end if;
  -- Existing member deletions and account-email changes must not race snapshot.
  perform 1 from public.wwm_members m where m.room_id=p_room_id for share;
  perform 1 from auth.users u join public.wwm_members m on m.user_id=u.id
    where m.room_id=p_room_id for share of u;
  if p_revision is distinct from 1 or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_google_event_id !~ '^[0-9a-v]+$' or char_length(p_google_event_id) not between 5 and 1024
     or p_payload_hash is null or p_google_event_id is null
     or p_title is null or char_length(btrim(p_title)) not between 1 and 100
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
    from public.wwm_members m where m.room_id=p_room_id;
  select array_agg(x order by x) into chosen from unnest(p_recipients) x;
  select array_agg(x order by x) into omitted from unnest(p_excluded) x;
  if expected_ids is null or p_recipients is null or p_excluded is null
     or chosen is null or cardinality(chosen) <> cardinality(p_recipients)
     or cardinality(omitted) <> cardinality(p_excluded)
     or cardinality(p_recipients) + cardinality(p_excluded) <> cardinality(expected_ids)
     or exists (select 1 from unnest(p_recipients) x where x is null)
     or exists (select 1 from unnest(p_excluded) x where x is null)
     or (select count(distinct x) from unnest(p_recipients || p_excluded) x)
        <> cardinality(expected_ids)
     or (select array_agg(distinct x order by x) from unnest(p_recipients || p_excluded) x)
        is distinct from expected_ids
  then raise exception 'Recipients and exclusions must partition current members' using errcode='22023'; end if;
  select jsonb_agg(jsonb_build_object('userId',m.user_id,'email',btrim(u.email)) order by m.user_id)
    into attendee from public.wwm_members m join auth.users u on u.id=m.user_id
    where m.room_id=p_room_id and m.user_id=any(p_recipients);
  if jsonb_array_length(coalesce(attendee,'[]'::jsonb)) <> cardinality(chosen)
     or exists (select 1 from public.wwm_members m join auth.users u on u.id=m.user_id
       where m.room_id=p_room_id and m.user_id=any(p_recipients)
       and (u.email is null or btrim(u.email) !~ '^[^[:space:]@[:cntrl:]]+@[^[:space:]@.[:cntrl:]]+(\.[^[:space:]@.[:cntrl:]]+)+$'))
     or (select count(distinct lower(btrim(u.email))) from public.wwm_members m
         join auth.users u on u.id=m.user_id where m.room_id=p_room_id
         and m.user_id=any(p_recipients)) <> cardinality(chosen)
  then raise exception 'Invalid or duplicate recipient email' using errcode='22023'; end if;
  select btrim(u.email) into owner_email from auth.users u where u.id=auth.uid();
  if owner_email is null or owner_email !~ '^[^[:space:]@[:cntrl:]]+@[^[:space:]@.[:cntrl:]]+(\.[^[:space:]@.[:cntrl:]]+)+$'
  then raise exception 'Organizer email unavailable' using errcode='22023'; end if;
  select coalesce(jsonb_agg(x order by x),'[]'::jsonb) into excluded from unnest(p_excluded) x;
  select * into existing from public.wwm_confirmations where room_id=p_room_id;
  if found then
    if existing.payload_hash = p_payload_hash and existing.revision = p_revision
       and existing.google_event_id = p_google_event_id and existing.title = btrim(p_title)
       and existing.starts_at = p_starts_at and existing.ends_at = p_ends_at
       and existing.timezone = r.timezone and existing.organizer_id = auth.uid()
       and existing.organizer_email = owner_email
       and existing.attendee_snapshot = attendee and existing.excluded_snapshot = excluded
    then return case when existing.status='confirmed' then 'existing' else 'reconcile' end;
    end if;
    return 'conflict';
  end if;
  insert into public.wwm_confirmations(room_id,revision,payload_hash,google_event_id,
    organizer_id,organizer_email,title,starts_at,ends_at,timezone,
    attendee_snapshot,excluded_snapshot,status)
  values(p_room_id,p_revision,p_payload_hash,p_google_event_id,auth.uid(),owner_email,
    btrim(p_title),p_starts_at,p_ends_at,r.timezone,attendee,excluded,'pending');
  return 'reserved_reconcile_required';
end $$;
revoke all on function public.wwm_reserve_confirmation(uuid,integer,text,text,text,timestamptz,timestamptz,uuid[],uuid[]) from public,anon;
grant execute on function public.wwm_reserve_confirmation(uuid,integer,text,text,text,timestamptz,timestamptz,uuid[],uuid[]) to authenticated;

-- Members may read only non-sensitive confirmation fields, never addresses,
-- hashes, raw snapshots, or organizer account identifiers.
create function public.wwm_confirmation_status(p_room_id uuid)
returns table(revision integer,status text,title text,starts_at timestamptz,
  ends_at timestamptz,timezone text,google_event_url text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() or not wwm_private.is_member(p_room_id)
  then raise exception 'Meeting membership required' using errcode='42501'; end if;
  return query select c.revision,c.status,c.title,c.starts_at,c.ends_at,c.timezone,
    case when c.status='confirmed' then c.google_event_url else null::text end
    from public.wwm_confirmations c where c.room_id=p_room_id;
end $$;
revoke all on function public.wwm_confirmation_status(uuid) from public,anon;
grant execute on function public.wwm_confirmation_status(uuid) to authenticated;
commit;
