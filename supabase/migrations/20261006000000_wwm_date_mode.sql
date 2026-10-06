-- Additive date-only availability. Apply only after isolated database verification.
-- No confirmation writes; date confirmation semantics require a later migration.
begin;

alter table public.wwm_rooms
  add column schedule_mode text not null default 'time',
  alter column start_time drop not null,
  alter column end_time drop not null,
  add constraint wwm_schedule_mode check (schedule_mode in ('time','date')),
  add constraint wwm_mode_times check (
    (schedule_mode='time' and start_time is not null and end_time is not null)
    or (schedule_mode='date' and start_time is null and end_time is null)
  );
-- Keep the original wwm_time_span constraint: it still validates timed rooms;
-- its NULL result permits the two NULL time columns of date rooms.
alter table public.wwm_responses
  add column available_dates date[] not null default '{}',
  drop constraint wwm_slots_bounded,
  drop constraint wwm_slots_flat_bounded,
  add constraint wwm_slots_bounded check (cardinality(slots)<=1344),
  add constraint wwm_slots_flat_bounded check (
    cardinality(slots)<=1344 and
    (cardinality(slots)=0 or (array_ndims(slots)=1 and array_lower(slots,1)=1))
  ),
  add constraint wwm_dates_flat_bounded check (
    cardinality(available_dates)<=28 and
    (cardinality(available_dates)=0 or (array_ndims(available_dates)=1 and array_lower(available_dates,1)=1))
    and array_position(available_dates,null) is null
  ),
  add constraint wwm_availability_exclusive check (cardinality(available_dates)=0 or cardinality(slots)=0);

create or replace function wwm_private.validate_date_schedule(p_start_date date,p_end_date date,p_timezone text)
returns text language plpgsql set search_path = '' as $$
declare tz text := btrim(p_timezone);
begin
  if p_start_date is null or p_end_date is null
     or not isfinite(p_start_date) or not isfinite(p_end_date)
     or p_start_date < date '0001-01-01' or p_start_date > date '9999-12-31'
     or p_end_date < date '0001-01-01' or p_end_date > date '9999-12-31'
     or p_end_date<p_start_date or p_end_date>=p_start_date+28 then
    raise exception 'Invalid schedule' using errcode='22023';
  end if;
  if tz is null or char_length(tz) not between 1 and 64
     or not exists(select 1 from pg_catalog.pg_timezone_names z where z.name=tz) then
    raise exception 'Invalid timezone' using errcode='22023';
  end if;
  return tz;
end $$;
revoke all on function wwm_private.validate_date_schedule(date,date,text) from public,anon,authenticated;

create or replace function wwm_private.validate_room_mode()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op='UPDATE' and new.schedule_mode is distinct from old.schedule_mode then
    raise exception 'Schedule mode is immutable' using errcode='22023';
  end if;
  if new.schedule_mode='date' then
    if new.start_time is not null or new.end_time is not null then
      raise exception 'Date room cannot use time columns' using errcode='22023';
    end if;
    new.timezone:=wwm_private.validate_date_schedule(new.start_date,new.end_date,new.timezone);
  end if;
  return new;
end $$;
revoke all on function wwm_private.validate_room_mode() from public,anon,authenticated;
create trigger wwm_validate_room_mode before insert or update on public.wwm_rooms
for each row execute function wwm_private.validate_room_mode();

-- All response writes, including old direct timed writes, lock the room row.
-- RPCs take this lock before touching responses, serializing schedule edits/CAS.
create or replace function wwm_private.validate_slots()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.wwm_rooms; s timestamptz; local_slot timestamp; n int; d date;
begin
  if tg_op='UPDATE' and (new.room_id is distinct from old.room_id or new.user_id is distinct from old.user_id) then
    raise exception 'Response identity is immutable' using errcode='22023';
  end if;
  select * into r from public.wwm_rooms where id=new.room_id for update;
  if not found then raise exception 'Room not found'; end if;
  if r.schedule_mode='date' then
    if cardinality(new.slots)<>0 then raise exception 'Date room cannot use slots' using errcode='22023'; end if;
    if new.available_dates is null or cardinality(new.available_dates)>28
       or (cardinality(new.available_dates)>0 and (array_ndims(new.available_dates)<>1 or array_lower(new.available_dates,1)<>1))
       or array_position(new.available_dates,null) is not null then
      raise exception 'Invalid dates' using errcode='22023';
    end if;
    select count(distinct date_value) into n from unnest(new.available_dates) date_value;
    if n<>cardinality(new.available_dates) then raise exception 'Duplicate date' using errcode='22023'; end if;
    foreach d in array new.available_dates loop
      if not isfinite(d) or d < date '0001-01-01' or d > date '9999-12-31'
         or d < r.start_date or d > r.end_date then
        raise exception 'Date outside room schedule' using errcode='22023';
      end if;
    end loop;
  else
    if cardinality(new.available_dates)<>0 then raise exception 'Time room cannot use dates' using errcode='22023'; end if;
    if cardinality(new.slots)>1344 then raise exception 'Too many slots'; end if;
    select count(distinct value) into n from unnest(new.slots) value;
    if n<>cardinality(new.slots) then raise exception 'Duplicate or null slot'; end if;
    perform now() at time zone r.timezone;
    foreach s in array new.slots loop
      local_slot := s at time zone r.timezone;
      if local_slot::date < r.start_date or local_slot::date > r.end_date
        or local_slot::time < r.start_time or local_slot::time >= r.end_time
        or extract(minute from local_slot)::int % 30 <> 0
        or extract(second from local_slot) <> 0 then raise exception 'Slot outside room schedule'; end if;
    end loop;
  end if;
  -- No JSON/JS millisecond conversion: the returned timestamptz is the CAS token.
  -- Monotonic even for multiple writes in one transaction or clock adjustments.
  if tg_op='UPDATE' then
    new.updated_at:=greatest(clock_timestamp(),old.updated_at + interval '1 microsecond');
  else new.updated_at:=clock_timestamp(); end if;
  return new;
end $$;
revoke all on function wwm_private.validate_slots() from public,anon,authenticated;

create or replace function public.wwm_create_date_room(p_title text,p_start_date date,p_end_date date,p_timezone text,p_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.wwm_rooms; tz text;
begin
  if auth.uid() is null or not wwm_private.is_google() then
    raise exception 'Google authentication required' using errcode='42501';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 100 then
    raise exception 'Invalid title' using errcode='22023';
  end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 50 then
    raise exception 'Invalid name' using errcode='22023';
  end if;
  tz:=wwm_private.validate_date_schedule(p_start_date,p_end_date,p_timezone);
  if p_start_date<(now() at time zone tz)::date then raise exception 'Dates in the past' using errcode='22023'; end if;
  insert into public.wwm_rooms(owner_id,title,start_date,end_date,start_time,end_time,timezone,schedule_mode)
  values(auth.uid(),p_title,p_start_date,p_end_date,null,null,tz,'date') returning * into r;
  insert into public.wwm_members(room_id,user_id) values(r.id,auth.uid());
  insert into public.wwm_responses(room_id,user_id,display_name) values(r.id,auth.uid(),p_name);
  return jsonb_build_object('id',r.id,'invite_token',r.invite_token);
end $$;
revoke all on function public.wwm_create_date_room(text,date,date,text,text) from public,anon;
grant execute on function public.wwm_create_date_room(text,date,date,text,text) to authenticated;

-- Full replacement, not SQL-computed delta. Caller rebases its baseline delta and
-- retries a maximum of four times. SQLSTATE 40001 means stale availability CAS.
create or replace function public.wwm_save_dates(
  p_room_id uuid,p_name text,p_available_dates date[],p_expected_updated_at timestamptz)
returns table(updated_at timestamptz) language plpgsql security definer set search_path = '' as $$
declare r public.wwm_rooms; v_response public.wwm_responses;
begin
  if auth.uid() is null or not wwm_private.is_google() or not wwm_private.is_member(p_room_id) then
    raise exception 'Meeting access required' using errcode='42501';
  end if;
  select * into r from public.wwm_rooms where id=p_room_id for update;
  if not found then raise exception 'Meeting access required' using errcode='42501'; end if;
  if r.schedule_mode<>'date' then raise exception 'Date room required' using errcode='22023'; end if;
  if p_name is null or char_length(btrim(p_name)) not between 1 and 50 or p_available_dates is null then
    raise exception 'Invalid name or dates' using errcode='22023';
  end if;
  select * into v_response from public.wwm_responses x where x.room_id=p_room_id and x.user_id=auth.uid() for update;
  if not found then raise exception 'Response not found' using errcode='P0002'; end if;
  if p_expected_updated_at is null or v_response.updated_at is distinct from p_expected_updated_at then
    raise exception 'Availability conflict' using errcode='40001';
  end if;
  -- The trigger validates range/shape/uniqueness under the same room lock.
  return query update public.wwm_responses a set display_name=p_name,available_dates=p_available_dates
    where a.room_id=p_room_id and a.user_id=auth.uid() returning a.updated_at;
end $$;
revoke all on function public.wwm_save_dates(uuid,text,date[],timestamptz) from public,anon;
grant execute on function public.wwm_save_dates(uuid,text,date[],timestamptz) to authenticated;

create or replace function public.wwm_update_date_schedule(
  p_room_id uuid,p_start_date date,p_end_date date,p_timezone text)
returns table(start_date date,end_date date,timezone text,removed_dates integer)
language plpgsql security definer set search_path = '' as $$
declare r public.wwm_rooms; tz text; removed integer:=0;
begin
  if auth.uid() is null or not wwm_private.is_google() then
    raise exception 'Google meeting owner required' using errcode='42501';
  end if;
  select * into r from public.wwm_rooms where id=p_room_id for update;
  if not found or r.owner_id<>auth.uid() or not wwm_private.is_member(p_room_id) then
    raise exception 'Meeting owner required' using errcode='42501';
  end if;
  if r.schedule_mode<>'date' then raise exception 'Date room required' using errcode='22023'; end if;
  tz:=wwm_private.validate_date_schedule(p_start_date,p_end_date,p_timezone);
  if p_start_date<(now() at time zone tz)::date and p_start_date<>r.start_date then
    raise exception 'Dates in the past' using errcode='22023';
  end if;
  update public.wwm_rooms set start_date=p_start_date,end_date=p_end_date,timezone=tz where id=p_room_id;
  with trimmed as (
    select a.user_id,a.available_dates as before,
      coalesce((select array_agg(d order by d) from unnest(a.available_dates) d
        where d between p_start_date and p_end_date),'{}'::date[]) as after
    from public.wwm_responses a where a.room_id=p_room_id
  ), changed as (
    update public.wwm_responses a set available_dates=t.after
    from trimmed t where a.room_id=p_room_id and a.user_id=t.user_id and cardinality(t.after)<>cardinality(t.before)
    returning cardinality(t.before)-cardinality(t.after) as lost
  ) select coalesce(sum(lost),0)::int into removed from changed;
  return query select p_start_date,p_end_date,tz,removed;
end $$;
revoke all on function public.wwm_update_date_schedule(uuid,date,date,text) from public,anon;
grant execute on function public.wwm_update_date_schedule(uuid,date,date,text) to authenticated;

-- Existing timed schedule RPC is replaced below with only a mode guard added.
-- Keep its exact signature, owner contract, trimming, return shape and grants.
create or replace function public.wwm_update_room_schedule(
  p_room_id uuid,p_start_date date,p_end_date date,p_start_time time,p_end_time time,p_timezone text)
returns table(start_date date,end_date date,start_time time,end_time time,timezone text,removed_slots integer)
language plpgsql volatile security definer set search_path = '' as $$
declare r public.wwm_rooms; removed integer := 0; tz text := btrim(p_timezone);
begin
  if auth.uid() is null or not wwm_private.is_google() then
    raise exception 'Google meeting owner required' using errcode='42501';
  end if;
  select * into r from public.wwm_rooms where id=p_room_id for update;
  if not found or r.owner_id<>auth.uid() then raise exception 'Meeting owner required' using errcode='42501'; end if;
  if r.schedule_mode<>'time' then raise exception 'Time room required' using errcode='22023'; end if;
  if p_start_date is null or p_end_date is null or p_start_time is null or p_end_time is null
     or tz is null or char_length(tz) not between 1 and 64 then
    raise exception 'Invalid schedule' using errcode='22023';
  end if;
  begin perform now() at time zone tz;
  exception when others then raise exception 'Invalid timezone' using errcode='22023'; end;
  if p_end_date<p_start_date or p_end_date>=p_start_date+28
     or p_end_time<=p_start_time
     or extract(minute from p_start_time)::int % 30<>0 or extract(minute from p_end_time)::int % 30<>0
     or extract(second from p_start_time)<>0 or extract(second from p_end_time)<>0 then
    raise exception 'Invalid schedule' using errcode='22023';
  end if;
  if p_start_date<(now() at time zone tz)::date and p_start_date<>r.start_date then
    raise exception 'Dates in the past' using errcode='22023';
  end if;

  update public.wwm_rooms set start_date=p_start_date,end_date=p_end_date,start_time=p_start_time,end_time=p_end_time,timezone=tz
  where id=p_room_id;

  -- Keep only slots inside the new window (the response trigger re-validates and bumps updated_at,
  -- so open clients see a new version and merge instead of overwriting).
  with trimmed as (
    select a.user_id,a.slots as before,
      coalesce((select array_agg(s order by s) from unnest(a.slots) s
        where (s at time zone tz)::date between p_start_date and p_end_date
          and (s at time zone tz)::time>=p_start_time
          and (p_end_time=time '24:00' or (s at time zone tz)::time<p_end_time)),'{}'::timestamptz[]) as after
    from public.wwm_responses a where a.room_id=p_room_id
  ), changed as (
    update public.wwm_responses a set slots=t.after
    from trimmed t where a.room_id=p_room_id and a.user_id=t.user_id and cardinality(t.after)<>cardinality(t.before)
    returning cardinality(t.before)-cardinality(t.after) as lost
  )
  select coalesce(sum(lost),0)::int into removed from changed;

  return query select p_start_date,p_end_date,p_start_time,p_end_time,tz,removed;
end $$;
revoke all on function public.wwm_update_room_schedule(uuid,date,date,time,time,text) from public,anon;
grant execute on function public.wwm_update_room_schedule(uuid,date,date,time,time,text) to authenticated;

create or replace function public.wwm_room_people(p_room_id uuid)
returns table(user_id uuid,display_name text,is_admin boolean,has_availability boolean)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not wwm_private.is_google() or not wwm_private.is_member(p_room_id) then
  raise exception 'Meeting access required' using errcode = '42501';
 end if;
 return query
 select m.user_id,coalesce(nullif(btrim(a.display_name),''),'Participant'),
        m.user_id=r.owner_id,coalesce(case when r.schedule_mode='date' then cardinality(a.available_dates) else cardinality(a.slots) end,0)>0
 from public.wwm_members m
 join public.wwm_rooms r on r.id=m.room_id
 left join public.wwm_responses a on a.room_id=m.room_id and a.user_id=m.user_id
 where m.room_id=p_room_id
 order by (m.user_id=r.owner_id) desc,m.joined_at,m.user_id;
end;
$$;
revoke all on function public.wwm_room_people(uuid) from public,anon;
grant execute on function public.wwm_room_people(uuid) to authenticated;

create or replace function public.wwm_confirmation_attendees(p_room_id uuid)
returns table(user_id uuid,display_name text,email text,has_availability boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() or not exists (
    select 1 from public.wwm_rooms r where r.id=p_room_id and r.owner_id=auth.uid()
  ) then raise exception 'Meeting owner required' using errcode='42501'; end if;
  return query
    select m.user_id,coalesce(nullif(btrim(a.display_name),''),'Participant'),
           nullif(btrim(u.email),'')::text,coalesce(case when r.schedule_mode='date' then cardinality(a.available_dates) else cardinality(a.slots) end,0)>0
    from public.wwm_members m
    join public.wwm_rooms r on r.id=m.room_id
    join auth.users u on u.id=m.user_id
    left join public.wwm_responses a on a.room_id=m.room_id and a.user_id=m.user_id
    where m.room_id=p_room_id
    order by m.joined_at,m.user_id;
end $$;
revoke all on function public.wwm_confirmation_attendees(uuid) from public,anon;
grant execute on function public.wwm_confirmation_attendees(uuid) to authenticated;

commit;
