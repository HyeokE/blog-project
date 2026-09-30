-- Meetings may span up to 28 days (was 14).
-- 1. Room date span: end_date < start_date + 28.
-- 2. Response slots: 28 days x 48 half-hours = 1344 slots max (was 672).
-- 3. wwm_update_room_schedule: same 28-day bound as creation.

alter table public.wwm_rooms drop constraint wwm_date_span;
alter table public.wwm_rooms add constraint wwm_date_span check (end_date >= start_date and end_date < start_date + 28);

alter table public.wwm_responses drop constraint wwm_slots_flat_bounded;
alter table public.wwm_responses add constraint wwm_slots_flat_bounded check (
  cardinality(slots) <= 1344
  and (cardinality(slots) = 0 or (array_ndims(slots) = 1 and array_lower(slots, 1) = 1))
);

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
