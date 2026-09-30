-- Member-safe recipient flag for the confirmed meeting card.
-- Requires 20260930000200_wwm_confirmation.sql and 20261001000000_wwm_confirmation_revisions.sql.
--
-- Members cannot read the recipient list (snapshots hold login emails). This returns only whether
-- the caller is a recipient of the CURRENT confirmed meeting: public.wwm_confirmations keeps the one
-- row Google verifiably holds (an open edit lives in wwm_confirmation_revisions and is ignored until
-- it is confirmed and copied back). False when the meeting is not confirmed. Never returns emails.
begin;

create or replace function public.wwm_confirmation_is_recipient(p_room_id uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not wwm_private.is_google() or not wwm_private.is_member(p_room_id)
  then raise exception 'Meeting membership required' using errcode='42501'; end if;
  return coalesce((
    select exists (
      select 1 from jsonb_array_elements(c.attendee_snapshot) a
      where (a->>'userId')::uuid = auth.uid()
    )
    from public.wwm_confirmations c
    where c.room_id=p_room_id and c.status='confirmed'
  ),false);
end $$;
revoke all on function public.wwm_confirmation_is_recipient(uuid) from public,anon;
grant execute on function public.wwm_confirmation_is_recipient(uuid) to authenticated;

commit;
