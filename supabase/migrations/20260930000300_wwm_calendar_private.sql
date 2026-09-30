-- Server-only Calendar credential store and confirmation finalizer.
-- Provision the login role out of band (SCRAM verifier only) and grant it ONLY wwm_calendar_runtime.
-- Requires 20260930000200_wwm_confirmation.sql.
begin;
do $$ begin if not exists(select 1 from pg_roles where rolname='wwm_calendar_runtime') then create role wwm_calendar_runtime nologin; end if; end $$;
create schema if not exists wwm_calendar_private;
revoke all on schema wwm_calendar_private from public,anon,authenticated;
create table wwm_calendar_private.credentials(
 user_id uuid primary key references auth.users(id) on delete cascade,
 google_subject text not null,
 google_email text not null,
 credential_ciphertext text not null,
 updated_at timestamptz not null default now()
);
revoke all on all tables in schema wwm_calendar_private from public,anon,authenticated,wwm_calendar_runtime;
grant usage on schema wwm_calendar_private to wwm_calendar_runtime;
create function wwm_calendar_private.store_credential(p_user uuid,p_subject text,p_email text,p_cipher text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if length(p_subject)<1 or length(p_subject)>255 or length(p_email)<1 or length(p_email)>320 or length(p_cipher)<1 or length(p_cipher)>8192 then raise exception 'Invalid credential'; end if;
 insert into wwm_calendar_private.credentials(user_id,google_subject,google_email,credential_ciphertext)
 values(p_user,p_subject,p_email,p_cipher)
 on conflict(user_id) do update set google_subject=excluded.google_subject,google_email=excluded.google_email,credential_ciphertext=excluded.credential_ciphertext,updated_at=now();
end $$;
create function wwm_calendar_private.read_credential(p_user uuid,p_subject text)
returns table(google_subject text,google_email text,credential_ciphertext text)
language plpgsql security definer set search_path='' as $$
begin
 return query select c.google_subject,c.google_email,c.credential_ciphertext from wwm_calendar_private.credentials c
 where c.user_id=p_user and c.google_subject=p_subject;
end $$;
revoke all on all functions in schema wwm_calendar_private from public,anon,authenticated;
grant execute on function wwm_calendar_private.store_credential(uuid,text,text,text),wwm_calendar_private.read_credential(uuid,text) to wwm_calendar_runtime;
-- Finalization is reachable only from the server runtime role, never from browser sessions.
-- The server must first verify the owner session, reserve through wwm_reserve_confirmation,
-- and read the Google event back by its deterministic ID.
create function wwm_calendar_private.finalize_confirmation(
 p_room uuid,p_organizer uuid,p_event_id text,p_payload_hash text,p_status text,p_url text)
returns text language plpgsql security definer set search_path='' as $$
declare c public.wwm_confirmations;
begin
 select * into c from public.wwm_confirmations where room_id=p_room for update;
 if not found or c.organizer_id<>p_organizer or c.google_event_id<>p_event_id or c.payload_hash<>p_payload_hash then
  raise exception 'Confirmation claim mismatch' using errcode='42501';
 end if;
 if c.status='confirmed' then return 'confirmed'; end if;
 if p_status='confirmed' then
  if p_url is null or p_url !~ '^https://www\.google\.com/calendar/' then raise exception 'Invalid event link' using errcode='22023'; end if;
  update public.wwm_confirmations set status='confirmed',google_event_url=p_url,updated_at=now() where room_id=p_room;
  return 'confirmed';
 elsif p_status='reconciling' then
  update public.wwm_confirmations set status='reconciling',updated_at=now() where room_id=p_room;
  return 'reconciling';
 elsif p_status='released' then
  -- Only after Google confirmed no event exists for this ID: frees the room for another proposal.
  delete from public.wwm_confirmations where room_id=p_room;
  return 'released';
 end if;
 raise exception 'Invalid confirmation status' using errcode='22023';
end $$;
revoke all on function wwm_calendar_private.finalize_confirmation(uuid,uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function wwm_calendar_private.finalize_confirmation(uuid,uuid,text,text,text,text) to wwm_calendar_runtime;
commit;
