-- DRAFT ONLY. Review against the EXISTING shared hyeok.dev project before applying.
create schema if not exists wwm_private;
revoke all on schema wwm_private from public, anon, authenticated;

create table public.wwm_rooms (
  id uuid primary key default gen_random_uuid(),
  invite_token uuid not null unique default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  start_date date not null, end_date date not null,
  start_time time not null, end_time time not null,
  timezone text not null check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  constraint wwm_date_span check (end_date >= start_date and end_date < start_date + 14),
  constraint wwm_time_span check (end_time > start_time and extract(minute from start_time)::int % 30 = 0 and extract(minute from end_time)::int % 30 = 0 and extract(second from start_time) = 0 and extract(second from end_time) = 0)
);
create table public.wwm_members (
  room_id uuid not null references public.wwm_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key(room_id,user_id)
);
create table public.wwm_responses (
  room_id uuid not null,
  user_id uuid not null,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 50),
  slots timestamptz[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(room_id,user_id),
  foreign key(room_id,user_id) references public.wwm_members(room_id,user_id) on delete cascade,
  constraint wwm_slots_bounded check (coalesce(array_length(slots,1),0) <= 672)
);
create index wwm_responses_room_idx on public.wwm_responses(room_id);

create function wwm_private.is_google() returns boolean language sql stable set search_path = '' as $$
  select coalesce((auth.jwt()->'app_metadata'->'providers') ? 'google',false) and coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false;
$$;
create function wwm_private.is_member(p_room uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.wwm_members where room_id=p_room and user_id=(select auth.uid()));
$$;
create function wwm_private.validate_slots() returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.wwm_rooms; s timestamptz; local_slot timestamp; n int;
begin
  select * into r from public.wwm_rooms where id=new.room_id;
  if not found then raise exception 'Room not found'; end if;
  if coalesce(array_length(new.slots,1),0)>672 then raise exception 'Too many slots'; end if;
  select count(distinct value) into n from unnest(new.slots) value;
  if n<>coalesce(array_length(new.slots,1),0) then raise exception 'Duplicate or null slot'; end if;
  -- PostgreSQL rejects invalid IANA timezone names during AT TIME ZONE.
  perform now() at time zone r.timezone;
  foreach s in array new.slots loop
    local_slot := s at time zone r.timezone;
    if local_slot::date < r.start_date or local_slot::date > r.end_date
      or local_slot::time < r.start_time or local_slot::time >= r.end_time
      or extract(minute from local_slot)::int % 30 <> 0
      or extract(second from local_slot) <> 0 then raise exception 'Slot outside room schedule'; end if;
  end loop;
  new.updated_at:=now(); return new;
end $$;
create trigger wwm_validate_response before insert or update on public.wwm_responses for each row execute function wwm_private.validate_slots();

create function wwm_private.create_room(p_title text,p_start_date date,p_end_date date,p_start_time time,p_end_time time,p_timezone text,p_name text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.wwm_rooms;
begin
  if auth.uid() is null or not wwm_private.is_google() then raise exception 'Google authentication required'; end if;
  if char_length(btrim(p_name)) not between 1 and 50 then raise exception 'Invalid name'; end if;
  perform now() at time zone p_timezone;
  insert into public.wwm_rooms(owner_id,title,start_date,end_date,start_time,end_time,timezone)
  values(auth.uid(),p_title,p_start_date,p_end_date,p_start_time,p_end_time,p_timezone) returning * into r;
  insert into public.wwm_members(room_id,user_id) values(r.id,auth.uid());
  insert into public.wwm_responses(room_id,user_id,display_name) values(r.id,auth.uid(),p_name);
  return jsonb_build_object('id',r.id,'invite_token',r.invite_token);
end $$;
create function wwm_private.join_room(p_room_id uuid,p_token uuid,p_name text) returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() then raise exception 'Google authentication required'; end if;
  if char_length(btrim(p_name)) not between 1 and 50 then raise exception 'Invalid name'; end if;
  if not exists(select 1 from public.wwm_rooms where id=p_room_id and invite_token=p_token) then return false; end if;
  insert into public.wwm_members(room_id,user_id) values(p_room_id,auth.uid()) on conflict do nothing;
  insert into public.wwm_responses(room_id,user_id,display_name) values(p_room_id,auth.uid(),p_name) on conflict(room_id,user_id) do nothing;
  return true;
end $$;
-- Invoker wrappers are the sole exposed RPC entrypoints; the definer helpers are not in PostgREST's exposed schema.
create function public.wwm_create_room(p_title text,p_start_date date,p_end_date date,p_start_time time,p_end_time time,p_timezone text,p_name text) returns jsonb language sql security invoker set search_path = '' as $$
  select wwm_private.create_room(p_title,p_start_date,p_end_date,p_start_time,p_end_time,p_timezone,p_name);
$$;
create function public.wwm_join_room(p_room_id uuid,p_token uuid,p_name text) returns boolean language sql security invoker set search_path = '' as $$
  select wwm_private.join_room(p_room_id,p_token,p_name);
$$;
revoke all on function public.wwm_create_room(text,date,date,time,time,text,text), public.wwm_join_room(uuid,uuid,text) from public, anon;
grant usage on schema wwm_private to authenticated;
revoke all on function wwm_private.create_room(text,date,date,time,time,text,text), wwm_private.join_room(uuid,uuid,text), wwm_private.is_member(uuid), wwm_private.is_google() from public, anon;
grant execute on function public.wwm_create_room(text,date,date,time,time,text,text), public.wwm_join_room(uuid,uuid,text), wwm_private.create_room(text,date,date,time,time,text,text), wwm_private.join_room(uuid,uuid,text), wwm_private.is_member(uuid), wwm_private.is_google() to authenticated;

alter table public.wwm_rooms enable row level security;
alter table public.wwm_members enable row level security;
alter table public.wwm_responses enable row level security;
create policy wwm_rooms_member_read on public.wwm_rooms for select to authenticated using (wwm_private.is_google() and wwm_private.is_member(id));
create policy wwm_members_self_read on public.wwm_members for select to authenticated using (wwm_private.is_google() and user_id=(select auth.uid()));
create policy wwm_responses_member_read on public.wwm_responses for select to authenticated using (wwm_private.is_google() and wwm_private.is_member(room_id));
create policy wwm_responses_own_insert on public.wwm_responses for insert to authenticated with check (wwm_private.is_google() and user_id=(select auth.uid()) and wwm_private.is_member(room_id));
create policy wwm_responses_own_update on public.wwm_responses for update to authenticated using (wwm_private.is_google() and user_id=(select auth.uid()) and wwm_private.is_member(room_id)) with check (wwm_private.is_google() and user_id=(select auth.uid()) and wwm_private.is_member(room_id));
revoke all on public.wwm_rooms, public.wwm_members, public.wwm_responses from public, anon, authenticated;
grant select on public.wwm_rooms, public.wwm_responses to authenticated;
grant insert(room_id,user_id,display_name,slots), update(display_name,slots) on public.wwm_responses to authenticated;
