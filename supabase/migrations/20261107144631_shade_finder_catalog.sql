-- Do not add shade_finder_private to PostgREST's exposed schemas.
-- Runtime access uses bounded, SECURITY INVOKER public RPCs and caller RLS.
create schema shade_finder_private;
revoke all on schema shade_finder_private from public, anon, authenticated;
grant usage on schema shade_finder_private to anon, authenticated;

create type public.shade_product_type as enum ('foundation', 'cushion');

create table shade_finder_private.imports (
  source_sha256 text primary key check (source_sha256 ~ '^[0-9a-f]{64}$'),
  catalog_sha256 text not null check (catalog_sha256 ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz not null check (isfinite(captured_at)),
  metadata jsonb not null check (jsonb_typeof(metadata) = 'object'),
  imported_at timestamptz not null default now()
);

create table shade_finder_private.brands (
  id text primary key check (id ~ '^[A-Za-z0-9_-]+$'),
  name text not null check (length(btrim(name)) > 0),
  name_en text not null,
  import_sha256 text not null references shade_finder_private.imports(source_sha256)
);

create table shade_finder_private.products (
  id text primary key check (id ~ '^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'),
  brand_id text not null references shade_finder_private.brands(id),
  name text not null check (length(btrim(name)) > 0),
  name_en text not null,
  product_type public.shade_product_type not null,
  sort_order integer not null check (sort_order >= 0),
  import_sha256 text not null references shade_finder_private.imports(source_sha256),
  check (split_part(id, ':', 1) = brand_id)
);
create index shade_products_brand_type_order_idx
  on shade_finder_private.products (brand_id, product_type, sort_order);

create table shade_finder_private.shades (
  id text primary key check (id ~ '^[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$'),
  product_id text not null references shade_finder_private.products(id),
  name text not null check (length(btrim(name)) > 0),
  hex text not null check (hex ~ '^#[0-9a-f]{6}$'),
  lab_l double precision not null check (lab_l between -0.001 and 100.001),
  lab_a double precision not null check (lab_a between -160 and 160),
  lab_b double precision not null check (lab_b between -160 and 160),
  sort_order integer not null check (sort_order >= 0),
  import_sha256 text not null references shade_finder_private.imports(source_sha256),
  check (id = product_id || ':' || split_part(id, ':', 3))
);
create index shade_shades_product_order_idx
  on shade_finder_private.shades (product_id, sort_order);

alter table shade_finder_private.imports enable row level security;
alter table shade_finder_private.brands enable row level security;
alter table shade_finder_private.products enable row level security;
alter table shade_finder_private.shades enable row level security;
revoke all on all tables in schema shade_finder_private from public, anon, authenticated;
grant select on shade_finder_private.brands, shade_finder_private.products,
  shade_finder_private.shades to anon, authenticated;
create policy shade_brands_read on shade_finder_private.brands
  for select to anon, authenticated using (true);
create policy shade_products_read on shade_finder_private.products
  for select to anon, authenticated using (true);
create policy shade_shades_read on shade_finder_private.shades
  for select to anon, authenticated using (true);
-- imports has no runtime grants or policies; all runtime writes are denied.

-- Sharma, Wu & Dalal CIEDE2000, kL = kC = kH = 1.
-- Inputs are precomputed D50 Lab from the canonical lowercase six-digit HEX.
create function shade_finder_private.delta_e_2000(
  l1 double precision, a1 double precision, b1 double precision,
  l2 double precision, a2 double precision, b2 double precision
) returns double precision
language plpgsql immutable strict parallel safe security invoker set search_path = ''
as $$
declare
  rad double precision := pg_catalog.pi() / 180;
  mean_chroma double precision := (pg_catalog.sqrt(a1*a1 + b1*b1) + pg_catalog.sqrt(a2*a2 + b2*b2)) / 2;
  g double precision := 0.5 * (1 - pg_catalog.sqrt(mean_chroma^7 / (mean_chroma^7 + 25::double precision^7)));
  a1_prime double precision := (1 + g) * a1;
  a2_prime double precision := (1 + g) * a2;
  c1 double precision := pg_catalog.sqrt(a1_prime*a1_prime + b1*b1);
  c2 double precision := pg_catalog.sqrt(a2_prime*a2_prime + b2*b2);
  h1 double precision := case when c1 = 0 then 0 else pg_catalog.atan2(b1, a1_prime) / rad end;
  h2 double precision := case when c2 = 0 then 0 else pg_catalog.atan2(b2, a2_prime) / rad end;
  delta_l double precision := l2 - l1;
  delta_c double precision := c2 - c1;
  hue_difference double precision;
  hue_sum double precision;
  delta_hue double precision;
  delta_h double precision;
  mean_l double precision := (l1 + l2) / 2;
  mean_c double precision := (c1 + c2) / 2;
  mean_h double precision;
  t double precision;
  s_l double precision;
  s_c double precision;
  s_h double precision;
  rotation double precision;
  lightness double precision;
  chroma double precision;
  hue_term double precision;
begin
  if h1 < 0 then h1 := h1 + 360; end if;
  if h2 < 0 then h2 := h2 + 360; end if;
  hue_difference := h2 - h1;
  hue_sum := h1 + h2;
  delta_hue := case when c1*c2 = 0 then 0 else hue_difference end;
  if delta_hue > 180 then delta_hue := delta_hue - 360; end if;
  if delta_hue < -180 then delta_hue := delta_hue + 360; end if;
  delta_h := 2 * pg_catalog.sqrt(c1*c2) * pg_catalog.sin(delta_hue*rad / 2);
  mean_h := hue_sum;
  if c1*c2 <> 0 then
    mean_h := case when pg_catalog.abs(hue_difference) <= 180 then hue_sum / 2
      else (hue_sum + case when hue_sum < 360 then 360 else -360 end) / 2 end;
  end if;
  t := 1 - 0.17 * pg_catalog.cos((mean_h - 30)*rad)
    + 0.24 * pg_catalog.cos(2*mean_h*rad)
    + 0.32 * pg_catalog.cos((3*mean_h + 6)*rad)
    - 0.2 * pg_catalog.cos((4*mean_h - 63)*rad);
  s_l := 1 + (0.015 * (mean_l - 50)^2) / pg_catalog.sqrt(20 + (mean_l - 50)^2);
  s_c := 1 + 0.045 * mean_c;
  s_h := 1 + 0.015 * mean_c * t;
  rotation := -2 * pg_catalog.sqrt(mean_c^7 / (mean_c^7 + 25::double precision^7))
    * pg_catalog.sin(60 * pg_catalog.exp(-(((mean_h - 275)/25)^2)) * rad);
  lightness := delta_l / s_l;
  chroma := delta_c / s_c;
  hue_term := delta_h / s_h;
  return pg_catalog.sqrt(greatest(0, lightness^2 + chroma^2 + hue_term^2 + rotation*chroma*hue_term));
end;
$$;

create function public.shade_finder_brands()
returns table(id text, name text, name_en text, product_types public.shade_product_type[])
language sql stable security invoker set search_path = ''
as $$
  select b.id, b.name, b.name_en, array_agg(distinct p.product_type order by p.product_type)
  from shade_finder_private.brands b join shade_finder_private.products p on p.brand_id = b.id
  group by b.id, b.name, b.name_en order by b.id collate "C";
$$;

create function public.shade_finder_products(p_brand_id text, p_type public.shade_product_type default null)
returns table(id text, name text, name_en text, product_type public.shade_product_type)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_brand_id is null or p_brand_id = '' then
    raise exception 'Brand ID is required' using errcode = '22023';
  end if;
  if not exists (select 1 from shade_finder_private.brands b where b.id = p_brand_id) then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;
  return query select p.id, p.name, p.name_en, p.product_type
    from shade_finder_private.products p
    where p.brand_id = p_brand_id and (p_type is null or p.product_type = p_type)
    order by p.sort_order, p.id collate "C";
end;
$$;

create function public.shade_finder_shades(p_product_id text)
returns table(id text, name text, hex text)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_product_id is null or p_product_id = '' then
    raise exception 'Product ID is required' using errcode = '22023';
  end if;
  if not exists (select 1 from shade_finder_private.products p where p.id = p_product_id) then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  return query select s.id, s.name, s.hex from shade_finder_private.shades s
    where s.product_id = p_product_id order by s.sort_order, s.id collate "C";
end;
$$;

create function public.shade_finder_matches(
  p_shade_id text, p_type public.shade_product_type default null,
  p_brand_id text default null, p_offset integer default 0
) returns table(
  product_id text, product_name text, product_name_en text,
  product_type public.shade_product_type, brand_name text,
  shade_id text, shade_name text, hex text, delta_e double precision, total_count bigint
)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  source shade_finder_private.shades%rowtype;
begin
  if p_offset is null or p_offset < 0 or p_offset > 100000 or p_offset % 6 <> 0 then
    raise exception 'Offset must be a multiple of six between 0 and 100000' using errcode = '22023';
  end if;
  if p_shade_id is null or p_shade_id = '' then
    raise exception 'Shade ID is required' using errcode = '22023';
  end if;
  select s.* into source from shade_finder_private.shades s where s.id = p_shade_id;
  if not found then raise exception 'Shade not found' using errcode = 'P0002'; end if;
  if p_brand_id is not null and not exists (select 1 from shade_finder_private.brands b where b.id = p_brand_id) then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;
  return query
  with candidates as materialized (
    select p.id as product_id, p.name as product_name, p.name_en as product_name_en,
      p.product_type, b.name as brand_name, s.id as shade_id, s.name as shade_name, s.hex,
      shade_finder_private.delta_e_2000(source.lab_l, source.lab_a, source.lab_b, s.lab_l, s.lab_a, s.lab_b) as delta_e
    from shade_finder_private.products p
    join shade_finder_private.brands b on b.id = p.brand_id
    join shade_finder_private.shades s on s.product_id = p.id
    where p.id <> source.product_id
      and (p_type is null or p.product_type = p_type)
      and (p_brand_id is null or p.brand_id = p_brand_id)
  ), nearest as (
    select distinct on (c.product_id collate "C") c.* from candidates c
    order by c.product_id collate "C", c.delta_e, c.shade_id collate "C"
  )
  select n.*, count(*) over () from nearest n
  order by n.delta_e, n.product_id collate "C", n.shade_id collate "C"
  limit 6 offset p_offset;
end;
$$;

revoke all on function shade_finder_private.delta_e_2000(double precision, double precision, double precision, double precision, double precision, double precision) from public;
grant execute on function shade_finder_private.delta_e_2000(double precision, double precision, double precision, double precision, double precision, double precision) to anon, authenticated;
revoke all on function public.shade_finder_brands() from public;
revoke all on function public.shade_finder_products(text, public.shade_product_type) from public;
revoke all on function public.shade_finder_shades(text) from public;
revoke all on function public.shade_finder_matches(text, public.shade_product_type, text, integer) from public;
grant execute on function public.shade_finder_brands() to anon, authenticated;
grant execute on function public.shade_finder_products(text, public.shade_product_type) to anon, authenticated;
grant execute on function public.shade_finder_shades(text) to anon, authenticated;
grant execute on function public.shade_finder_matches(text, public.shade_product_type, text, integer) to anon, authenticated;
