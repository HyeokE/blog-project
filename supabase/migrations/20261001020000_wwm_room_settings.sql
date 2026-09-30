-- Invitation preview (pre-sign-in context) and owner schedule edit / delete.
-- Requires 20260929000000_wwm.sql (+ flat slots) and 20260930000200_wwm_confirmation.sql.
--
-- 1. wwm_invitation_preview: token-gated, member-less read for the invitation landing. Returns ONLY
--    title, dates, timezone and the organizer's display name in this meeting, and only when the
--    invite token matches the room. No emails, no member list, no ids, no invite token. Mismatch → no row.
-- 2. wwm_update_room_schedule: owner-only. Same bounds as creation (table constraints: <= 14 days,
--    30-minute times; valid IANA timezone; a start date in the past only when it is the existing start).
--    Saved availability outside the new window is REMOVED in the same transaction. A confirmed meeting
--    (wwm_confirmations / Google event / invitations) is left exactly as it was.
-- 3. wwm_delete_room: owner-only delete; members, responses, confirmations and revisions cascade.
--    The Google Calendar event itself is not touched (the server never cancels it implicitly).
begin;

create or replace function public.wwm_invitation_preview(p_room_id uuid,p_token uuid)
returns table(title text,start_date date,end_date date,timezone text,organizer_name text)
language sql stable security definer set search_path = '' as $$
  select r.title,r.start_date,r.end_date,r.timezone,
         nullif(btrim(a.display_name),'')
  from public.wwm_rooms r
  left join public.wwm_responses a on a.room_id=r.id and a.user_id=r.owner_id
  where p_room_id is not null and p_token is not null and r.id=p_room_id and r.invite_token=p_token;
$$;
revoke all on function public.wwm_invitation_preview(uuid,uuid) from public;
grant execute on function public.wwm_invitation_preview(uuid,uuid) to anon,authenticated;

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
  if p_end_date<p_start_date or p_end_date>=p_start_date+14
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

create or replace function public.wwm_delete_room(p_room_id uuid)
returns boolean language plpgsql volatile security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() then
    raise exception 'Google meeting owner required' using errcode='42501';
  end if;
  delete from public.wwm_rooms where id=p_room_id and owner_id=auth.uid();
  if not found then raise exception 'Meeting owner required' using errcode='42501'; end if;
  return true;
end $$;
revoke all on function public.wwm_delete_room(uuid) from public,anon;
grant execute on function public.wwm_delete_room(uuid) to authenticated;

commit;
