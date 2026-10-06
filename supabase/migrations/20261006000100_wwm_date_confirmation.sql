-- Date-only confirmation claims. Local verification required before deployment.
-- A reservation is never Google authorization or evidence of confirmation.
begin;
alter table public.wwm_confirmations
  add column schedule_mode text not null default 'time',
  add column start_date date,
  add column end_date date,
  alter column starts_at drop not null,
  alter column ends_at drop not null,
  drop constraint wwm_confirmations_check,
  add constraint wwm_confirmations_mode_interval check (
    (schedule_mode='time' and starts_at is not null and ends_at is not null and ends_at>starts_at
      and start_date is null and end_date is null)
    or (schedule_mode='date' and starts_at is null and ends_at is null
      and start_date is not null and end_date is not null
      and isfinite(start_date) and isfinite(end_date)
      and start_date>=date '0001-01-01' and start_date<date '9999-12-31'
      and end_date<=date '9999-12-31' and end_date=start_date+1)
  );
alter table public.wwm_confirmation_revisions
  add column schedule_mode text not null default 'time',
  add column start_date date,
  add column end_date date,
  alter column starts_at drop not null,
  alter column ends_at drop not null,
  drop constraint wwm_confirmation_revisions_check,
  add constraint wwm_confirmation_revisions_mode_interval check (
    (schedule_mode='time' and starts_at is not null and ends_at is not null and ends_at>starts_at
      and start_date is null and end_date is null)
    or (schedule_mode='date' and starts_at is null and ends_at is null
      and start_date is not null and end_date is not null
      and isfinite(start_date) and isfinite(end_date)
      and start_date>=date '0001-01-01' and start_date<date '9999-12-31'
      and end_date<=date '9999-12-31' and end_date=start_date+1)
  );
create or replace function wwm_private.validate_confirmation_mode()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.wwm_rooms;
begin
  -- Room mode is immutable; this check must not lock room after root/history.
  select * into r from public.wwm_rooms where id=new.room_id;
  if not found or new.schedule_mode is distinct from r.schedule_mode then
    raise exception 'Confirmation mode must match room' using errcode='22023';
  end if;
  if tg_op='UPDATE' and new.schedule_mode is distinct from old.schedule_mode then
    raise exception 'Confirmation mode is immutable' using errcode='22023';
  end if;
  -- Durable snapshots are independent of the room's mutable availability range.
  -- Civil/exclusive interval constraints remain on both tables; new proposals
  -- are range-checked by the authorized reservation RPCs.
  return new;
end $$;
revoke all on function wwm_private.validate_confirmation_mode() from public,anon,authenticated;
create trigger wwm_confirmation_mode before insert or update on public.wwm_confirmations
for each row execute function wwm_private.validate_confirmation_mode();
create trigger wwm_confirmation_revision_mode before insert or update on public.wwm_confirmation_revisions
for each row execute function wwm_private.validate_confirmation_mode();
create or replace function public.wwm_reserve_confirmation(
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
  if r.schedule_mode<>'time' then raise exception 'Time room required' using errcode='22023'; end if;
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

create or replace function wwm_private.confirmation_claim(
  r public.wwm_rooms,p_title text,p_starts_at timestamptz,p_ends_at timestamptz,
  p_recipients uuid[],p_excluded uuid[],p_optional uuid[],
  out attendee jsonb,out excluded jsonb,out owner_email text
) language plpgsql stable security definer set search_path = '' as $$
declare expected_ids uuid[]; chosen uuid[]; omitted uuid[];
begin
  if r.schedule_mode<>'time' then raise exception 'Time room required' using errcode='22023'; end if;
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

create or replace function wwm_private.date_confirmation_claim(
  r public.wwm_rooms,p_title text,p_start_date date,p_end_date date,
  p_recipients uuid[],p_excluded uuid[],p_optional uuid[],
  out attendee jsonb,out excluded jsonb,out owner_email text
) language plpgsql stable security definer set search_path = '' as $$
declare expected_ids uuid[]; chosen uuid[]; omitted uuid[];
begin
  if r.schedule_mode <> 'date' or p_title is null or char_length(btrim(p_title)) not between 1 and 100
     or p_title ~ '[[:cntrl:]]' or p_start_date is null or p_end_date is null
     or not isfinite(p_start_date) or not isfinite(p_end_date)
     or p_start_date < date '0001-01-01' or p_start_date >= date '9999-12-31'
     or p_end_date < date '0001-01-01' or p_end_date > date '9999-12-31'
     or p_end_date <> p_start_date + 1 then
    raise exception 'Invalid date confirmation interval or claim' using errcode='22023';
  end if;
  if exists (select 1 from (values (p_recipients),(p_excluded),(p_optional)) a(v)
    where v is null or (cardinality(v)>0 and (array_ndims(v)<>1 or array_lower(v,1)<>1))) then
    raise exception 'Invalid member array' using errcode='22023';
  end if;
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
revoke all on function wwm_private.date_confirmation_claim(public.wwm_rooms,text,date,date,uuid[],uuid[],uuid[]) from public,anon,authenticated;

create or replace function public.wwm_reserve_date_confirmation(
  p_room_id uuid,p_revision integer,p_payload_hash text,p_event_id text,
  p_title text,p_start_date date,p_end_date date,
  p_recipient_ids uuid[],p_excluded_ids uuid[],p_optional_ids uuid[]
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
  if not wwm_private.is_member(p_room_id) then raise exception 'Meeting membership required' using errcode='42501'; end if;
  if p_revision is distinct from 1 or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_event_id is null or p_event_id !~ '^[0-9a-v]+$' or char_length(p_event_id) not between 5 and 1024
  then raise exception 'Invalid confirmation claim' using errcode='22023'; end if;
  select c.attendee,c.excluded,c.owner_email into attendee,excluded,owner_email
    from wwm_private.date_confirmation_claim(r,p_title,p_start_date,p_end_date,p_recipient_ids,p_excluded_ids,p_optional_ids) c;
  select * into existing from public.wwm_confirmations where room_id=p_room_id;
  if found then
    if existing.payload_hash = p_payload_hash and existing.revision = p_revision
       and existing.google_event_id = p_event_id and existing.title = btrim(p_title)
       and existing.schedule_mode = 'date' and existing.start_date = p_start_date and existing.end_date = p_end_date
       and existing.timezone = r.timezone and existing.organizer_id = auth.uid()
       and existing.organizer_email = owner_email
       and existing.attendee_snapshot = attendee and existing.excluded_snapshot = excluded
    then return case when existing.status='confirmed' then 'existing' else 'reconcile' end;
    end if;
    return 'conflict';
  end if;
  if p_start_date not between r.start_date and r.end_date then
    raise exception 'Date outside room schedule' using errcode='22023';
  end if;
  insert into public.wwm_confirmations(room_id,revision,payload_hash,google_event_id,
    organizer_id,organizer_email,title,schedule_mode,start_date,end_date,timezone,
    attendee_snapshot,excluded_snapshot,status)
  values(p_room_id,p_revision,p_payload_hash,p_event_id,auth.uid(),owner_email,
    btrim(p_title),'date',p_start_date,p_end_date,r.timezone,attendee,excluded,'pending');
  return 'reserved';
end $$;
revoke all on function public.wwm_reserve_date_confirmation(uuid,integer,text,text,text,date,date,uuid[],uuid[],uuid[]) from public,anon;
grant execute on function public.wwm_reserve_date_confirmation(uuid,integer,text,text,text,date,date,uuid[],uuid[],uuid[]) to authenticated;

create or replace function public.wwm_reserve_date_confirmation_update(
  p_room_id uuid,p_revision integer,p_payload_hash text,
  p_title text,p_start_date date,p_end_date date,
  p_recipient_ids uuid[],p_excluded_ids uuid[],p_optional_ids uuid[]
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
  if not wwm_private.is_member(p_room_id) then raise exception 'Meeting membership required' using errcode='42501'; end if;
  perform 1 from public.wwm_members m where m.room_id=p_room_id for share;
  perform 1 from auth.users u join public.wwm_members m on m.user_id=u.id
    where m.room_id=p_room_id for share of u;
  if p_revision is null or p_revision < 2 or p_payload_hash is null or p_payload_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'Invalid confirmation interval or claim' using errcode='22023'; end if;
  select * into claim from wwm_private.date_confirmation_claim(r,p_title,p_start_date,p_end_date,p_recipient_ids,p_excluded_ids,p_optional_ids);
  select * into c from public.wwm_confirmations where room_id=p_room_id for update;
  if not found or c.status <> 'confirmed' or c.organizer_id <> auth.uid() then return 'not_confirmed'; end if;
  -- Retried edit that already applied.
  if c.revision = p_revision then
    return case when c.payload_hash = p_payload_hash and c.schedule_mode='date'
      and c.title=btrim(p_title) and c.start_date=p_start_date and c.end_date=p_end_date
      and c.timezone=r.timezone and c.organizer_email=claim.owner_email
      and c.attendee_snapshot=claim.attendee
      and c.excluded_snapshot=claim.excluded then 'existing' else 'conflict' end;
  end if;
  select * into open_edit from public.wwm_confirmation_revisions
    where room_id=p_room_id and status in ('pending','reconciling');
  if found then
    if open_edit.revision = p_revision and open_edit.payload_hash = p_payload_hash
       and open_edit.title = btrim(p_title) and open_edit.start_date = p_start_date
       and open_edit.end_date = p_end_date and open_edit.attendee_snapshot = claim.attendee
       and open_edit.excluded_snapshot = claim.excluded
       and open_edit.schedule_mode='date' and open_edit.timezone=r.timezone
       and c.organizer_email=claim.owner_email
    then return 'reconcile'; end if;
    return 'conflict';
  end if;
  if p_revision <> c.revision + 1 then return 'conflict'; end if;
  if p_start_date not between r.start_date and r.end_date then
    raise exception 'Date outside room schedule' using errcode='22023';
  end if;
  -- Keep the currently confirmed state as history (revision 1 rows predate this table).
  insert into public.wwm_confirmation_revisions(room_id,revision,base_revision,payload_hash,title,
    schedule_mode,start_date,end_date,timezone,attendee_snapshot,excluded_snapshot,status,google_event_url)
  values(c.room_id,c.revision,case when c.revision>1 then c.revision-1 end,c.payload_hash,c.title,
    c.schedule_mode,c.start_date,c.end_date,c.timezone,c.attendee_snapshot,c.excluded_snapshot,'confirmed',c.google_event_url)
  on conflict (room_id,revision) do nothing;
  -- A previously reverted attempt at this revision is replaced by the new proposal.
  insert into public.wwm_confirmation_revisions(room_id,revision,base_revision,payload_hash,title,
    schedule_mode,start_date,end_date,timezone,attendee_snapshot,excluded_snapshot,status)
  values(p_room_id,p_revision,c.revision,p_payload_hash,btrim(p_title),'date',p_start_date,p_end_date,
    r.timezone,claim.attendee,claim.excluded,'pending')
  on conflict (room_id,revision) do update set payload_hash=excluded.payload_hash,title=excluded.title,
    schedule_mode=excluded.schedule_mode,start_date=excluded.start_date,end_date=excluded.end_date,timezone=excluded.timezone,
    attendee_snapshot=excluded.attendee_snapshot,excluded_snapshot=excluded.excluded_snapshot,
    status='pending',google_event_url=null,created_at=now(),updated_at=now()
    where public.wwm_confirmation_revisions.status='reverted';
  if not found then return 'conflict'; end if;
  return 'reserved';
end $$;
revoke all on function public.wwm_reserve_date_confirmation_update(uuid,integer,text,text,date,date,uuid[],uuid[],uuid[]) from public,anon;
grant execute on function public.wwm_reserve_date_confirmation_update(uuid,integer,text,text,date,date,uuid[],uuid[],uuid[]) to authenticated;

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
   starts_at=e.starts_at,ends_at=e.ends_at,schedule_mode=e.schedule_mode,start_date=e.start_date,end_date=e.end_date,timezone=e.timezone,attendee_snapshot=e.attendee_snapshot,
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
create or replace function public.wwm_date_confirmation_status(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() or not wwm_private.is_member(p_room_id) then
    raise exception 'Meeting membership required' using errcode='42501';
  end if;
  return (select jsonb_build_object('revision',c.revision,'status',c.status,'title',c.title,
    'schedule_mode',c.schedule_mode,'start_date',c.start_date,'end_date',c.end_date,
    'starts_at',c.starts_at,'ends_at',c.ends_at,'timezone',c.timezone,
    'google_event_url',case when c.status='confirmed' then c.google_event_url else null end)
    from public.wwm_confirmations c where c.room_id=p_room_id);
end $$;
revoke all on function public.wwm_date_confirmation_status(uuid) from public,anon;
grant execute on function public.wwm_date_confirmation_status(uuid) to authenticated;
revoke all on function wwm_calendar_private.finalize_confirmation_update(uuid,uuid,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function wwm_calendar_private.finalize_confirmation_update(uuid,uuid,text,integer,text,text,text) to wwm_calendar_runtime;
commit;
