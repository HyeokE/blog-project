-- Authorized: member-only aggregate counts. No table/RLS/data mutation.
begin;
create or replace function public.wwm_participant_counts()
returns table(room_id uuid, participant_count bigint)
language sql stable security definer set search_path = ''
as $$
  select r.id, (select count(*) from public.wwm_members m where m.room_id = r.id)
  from public.wwm_rooms r
  where wwm_private.is_google() and wwm_private.is_member(r.id);
$$;
revoke all on function public.wwm_participant_counts() from public, anon;
grant execute on function public.wwm_participant_counts() to authenticated;
commit;
select p.proname, p.prosecdef, p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='wwm_participant_counts';
