create function shade_finder_private.hex_to_lab(p_hex text)
returns double precision[]
language plpgsql immutable security invoker set search_path = ''
as $$
declare
  rgb_bytes bytea;
  linear_rgb double precision[] := array[]::double precision[];
  xyz_d65 double precision[];
  xyz_d50 double precision[];
  white_point double precision[] := array[0.3457::double precision / 0.3585, 1, (1 - 0.3457::double precision - 0.3585) / 0.3585];
  f double precision[] := array[]::double precision[];
  channel double precision;
  relative double precision;
  i integer;
begin
  if p_hex is null or p_hex !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'HEX requires six hexadecimal digits prefixed with #' using errcode = '22023';
  end if;
  rgb_bytes := decode(substr(p_hex, 2), 'hex');
  for i in 0..2 loop
    channel := get_byte(rgb_bytes, i)::double precision / 255;
    linear_rgb := array_append(linear_rgb, case when channel <= 0.04045 then channel / 12.92 else power((channel + 0.055) / 1.055, 2.4) end);
  end loop;
  xyz_d65 := array[
    (506752::double precision / 1228815) * linear_rgb[1] + (87881::double precision / 245763) * linear_rgb[2] + (12673::double precision / 70218) * linear_rgb[3],
    (87098::double precision / 409605) * linear_rgb[1] + (175762::double precision / 245763) * linear_rgb[2] + (12673::double precision / 175545) * linear_rgb[3],
    (7918::double precision / 409605) * linear_rgb[1] + (87881::double precision / 737289) * linear_rgb[2] + (1001167::double precision / 1053270) * linear_rgb[3]
  ];
  xyz_d50 := array[
    1.0479297925449969 * xyz_d65[1] + 0.022946870601609652 * xyz_d65[2] - 0.05019226628920524 * xyz_d65[3],
    0.02962780877005599 * xyz_d65[1] + 0.9904344267538799 * xyz_d65[2] - 0.017073799063418826 * xyz_d65[3],
    -0.009243040646204504 * xyz_d65[1] + 0.015055191490298152 * xyz_d65[2] + 0.7518742814281371 * xyz_d65[3]
  ];
  for i in 1..3 loop
    relative := xyz_d50[i] / white_point[i];
    f := array_append(f, case when relative > 216::double precision / 24389 then cbrt(relative) else ((24389::double precision / 27) * relative + 16) / 116 end);
  end loop;
  return array[116 * f[2] - 16, 500 * (f[1] - f[2]), 200 * (f[2] - f[3])];
end;
$$;

revoke all on function shade_finder_private.hex_to_lab(text) from public;
grant execute on function shade_finder_private.hex_to_lab(text) to anon, authenticated;

create function public.shade_finder_matches_hex(
  p_hex text, p_type public.shade_product_type default null,
  p_brand_id uuid default null, p_offset integer default 0, p_query text default ''
) returns table(
  product_id uuid, product_name text, product_name_en text,
  product_type public.shade_product_type, brand_name text,
  shade_id uuid, shade_name text, hex text, delta_e double precision, total_count bigint
)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  source_lab double precision[];
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
  source_lab := shade_finder_private.hex_to_lab(p_hex);
  if p_brand_id is not null and not exists (select 1 from shade_finder_private.brands b where b.id = p_brand_id) then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;
  return query
  with candidates as materialized (
    select p.id as product_id, p.name as product_name, p.name_en as product_name_en,
      p.product_type, b.name as brand_name, b.name_en as brand_name_en, s.id as shade_id, s.name as shade_name, s.hex,
      shade_finder_private.delta_e_2000(source_lab[1], source_lab[2], source_lab[3], s.lab_l, s.lab_a, s.lab_b) as delta_e
    from shade_finder_private.products p
    join shade_finder_private.brands b on b.id = p.brand_id
    join shade_finder_private.shades s on s.product_id = p.id
    where (p_type is null or p.product_type = p_type)
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

revoke all on function public.shade_finder_matches_hex(text, public.shade_product_type, uuid, integer, text) from public;
grant execute on function public.shade_finder_matches_hex(text, public.shade_product_type, uuid, integer, text) to anon, authenticated;
