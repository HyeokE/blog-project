begin;
-- Email-bearing history is available exclusively to the current Google owner/member.
-- No table privileges are added. Member status remains the separate sanitized RPC.
create function public.wwm_date_confirmation_owner_detail(p_room_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.wwm_rooms; c public.wwm_confirmations; history jsonb;
begin
 if auth.uid() is null or not wwm_private.is_google() then
  raise exception 'Google meeting owner required' using errcode='42501';
 end if;
 select * into r from public.wwm_rooms where id=p_room_id;
 if not found or r.owner_id<>auth.uid() or not wwm_private.is_member(p_room_id) then
  raise exception 'Meeting owner membership required' using errcode='42501';
 end if;
 if r.schedule_mode<>'date' then raise exception 'Date room required' using errcode='22023'; end if;
 select * into c from public.wwm_confirmations where room_id=p_room_id;
 if not found then return null; end if;
 if c.organizer_id<>auth.uid() or c.schedule_mode<>'date' then
  raise exception 'Confirmation owner mismatch' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'room_id',e.room_id,'revision',e.revision,'base_revision',e.base_revision,
  'payload_hash',e.payload_hash,'title',e.title,'schedule_mode',e.schedule_mode,
  'start_date',e.start_date,'end_date',e.end_date,'starts_at',e.starts_at,'ends_at',e.ends_at,
  'timezone',e.timezone,'attendee_snapshot',e.attendee_snapshot,
  'excluded_snapshot',e.excluded_snapshot,'status',e.status,'google_event_url',e.google_event_url
 ) order by e.revision),'[]'::jsonb) into history
 from public.wwm_confirmation_revisions e where e.room_id=p_room_id;
 return jsonb_build_object('root',jsonb_build_object(
  'room_id',c.room_id,'revision',c.revision,'payload_hash',c.payload_hash,
  'google_event_id',c.google_event_id,'organizer_id',c.organizer_id,'organizer_email',c.organizer_email,
  'title',c.title,'schedule_mode',c.schedule_mode,'start_date',c.start_date,'end_date',c.end_date,
  'starts_at',c.starts_at,'ends_at',c.ends_at,'timezone',c.timezone,
  'attendee_snapshot',c.attendee_snapshot,'excluded_snapshot',c.excluded_snapshot,
  'status',c.status,'google_event_url',c.google_event_url),'revisions',history);
end $$;
revoke all on function public.wwm_date_confirmation_owner_detail(uuid) from public,anon;
grant execute on function public.wwm_date_confirmation_owner_detail(uuid) to authenticated;
commit;
