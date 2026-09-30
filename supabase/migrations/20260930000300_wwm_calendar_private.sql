-- LOCAL DRAFT ONLY. Provision a login with ONLY wwm_calendar_runtime granted out of band.
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
commit;
