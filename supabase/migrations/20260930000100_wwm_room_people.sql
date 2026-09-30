-- Authorized same-room member roster; no table data or RLS policy changes.
begin;
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
        m.user_id=r.owner_id,coalesce(cardinality(a.slots),0)>0
 from public.wwm_members m
 join public.wwm_rooms r on r.id=m.room_id
 left join public.wwm_responses a on a.room_id=m.room_id and a.user_id=m.user_id
 where m.room_id=p_room_id
 order by (m.user_id=r.owner_id) desc,m.joined_at,m.user_id;
end;
$$;
revoke all on function public.wwm_room_people(uuid) from public,anon;
grant execute on function public.wwm_room_people(uuid) to authenticated;
commit;
select p.proname,p.prosecdef,p.proconfig,
 has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
 has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname='wwm_room_people';
