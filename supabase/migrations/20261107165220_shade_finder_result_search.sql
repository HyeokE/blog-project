-- Search the closest shade per product before counting and paginating results.
-- Replace the old signature to avoid ambiguous default-argument RPC overloads.
drop function public.shade_finder_matches(uuid, public.shade_product_type, uuid, integer);

create function public.shade_finder_matches(
  p_shade_id uuid, p_type public.shade_product_type default null,
  p_brand_id uuid default null, p_offset integer default 0, p_query text default ''
) returns table(
  product_id uuid, product_name text, product_name_en text,
  product_type public.shade_product_type, brand_name text,
  shade_id uuid, shade_name text, hex text, delta_e double precision, total_count bigint
)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  source record;
  query_text text;
  query_tokens text[];
begin
  if char_length(coalesce(p_query, '')) > 100 or coalesce(p_query, '') ~ '[[:cntrl:]]' then
    raise exception 'Query must contain at most 100 characters and no control characters' using errcode = '22023';
  end if;
  query_text := lower(btrim(regexp_replace(coalesce(p_query, ''), '[[:space:]]+', ' ', 'g')));
  query_tokens := string_to_array(query_text, ' ');
  if p_offset is null or p_offset < 0 or p_offset > 100000 or p_offset % 6 <> 0 then
    raise exception 'Offset must be a multiple of six between 0 and 100000' using errcode = '22023';
  end if;
  if p_shade_id is null then
    raise exception 'Shade ID is required' using errcode = '22023';
  end if;
  select s.product_id, s.lab_l, s.lab_a, s.lab_b into source from shade_finder_private.shades s where s.id = p_shade_id;
  if not found then raise exception 'Shade not found' using errcode = 'P0002'; end if;
  if p_brand_id is not null and not exists (select 1 from shade_finder_private.brands b where b.id = p_brand_id) then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;
  return query
  with candidates as materialized (
    select p.id as product_id, p.name as product_name, p.name_en as product_name_en,
      p.product_type, b.name as brand_name, b.name_en as brand_name_en, s.id as shade_id, s.name as shade_name, s.hex,
      shade_finder_private.delta_e_2000(source.lab_l, source.lab_a, source.lab_b, s.lab_l, s.lab_a, s.lab_b) as delta_e
    from shade_finder_private.products p
    join shade_finder_private.brands b on b.id = p.brand_id
    join shade_finder_private.shades s on s.product_id = p.id
    where p.id <> source.product_id
      and (p_type is null or p.product_type = p_type)
      and (p_brand_id is null or p.brand_id = p_brand_id)
  ), nearest as (
    select distinct on (c.product_id) c.* from candidates c
    order by c.product_id, c.delta_e, c.shade_id
  ), matching as (
    select n.* from nearest n
    where query_text = '' or not exists (
      select 1 from unnest(query_tokens) as term(token)
      where strpos(lower(regexp_replace(concat_ws(' ', n.brand_name, n.brand_name_en,
        n.product_name, n.product_name_en, n.shade_name), '[[:space:]]+', ' ', 'g')), term.token) = 0
    )
  )
  select m.product_id, m.product_name, m.product_name_en, m.product_type, m.brand_name,
    m.shade_id, m.shade_name, m.hex, m.delta_e, count(*) over () from matching m
  order by m.delta_e, m.product_id, m.shade_id
  limit 6 offset p_offset;
end;
$$;

revoke all on function public.shade_finder_matches(uuid, public.shade_product_type, uuid, integer, text) from public;
grant execute on function public.shade_finder_matches(uuid, public.shade_product_type, uuid, integer, text) to anon, authenticated;
