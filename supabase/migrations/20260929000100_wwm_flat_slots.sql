-- Follow-up hardening after initial migration was applied.
-- Accept the empty selection, or a one-dimensional, one-based slot list.
alter table public.wwm_responses
  add constraint wwm_slots_flat_bounded check (
    cardinality(slots) <= 672
    and (cardinality(slots) = 0 or (array_ndims(slots) = 1 and array_lower(slots, 1) = 1))
  );
