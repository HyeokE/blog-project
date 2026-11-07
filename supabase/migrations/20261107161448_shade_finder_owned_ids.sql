-- Use database-generated UUIDs for runtime identities.
select pg_catalog.pg_advisory_xact_lock(1936220516, 1);
lock table shade_finder_private.brands, shade_finder_private.products,
  shade_finder_private.shades in access exclusive mode;

drop function public.shade_finder_brands();
drop function public.shade_finder_products(text, public.shade_product_type);
drop function public.shade_finder_shades(text);
drop function public.shade_finder_matches(text, public.shade_product_type, text, integer);

alter table shade_finder_private.brands
  add column database_id uuid not null default gen_random_uuid(),
  add column source_key text;
alter table shade_finder_private.products
  add column database_id uuid not null default gen_random_uuid(),
  add column database_brand_id uuid,
  add column source_key text;
alter table shade_finder_private.shades
  add column database_id uuid not null default gen_random_uuid(),
  add column database_product_id uuid,
  add column source_key text;

update shade_finder_private.brands
  set source_key = encode(sha256(convert_to('brand:' || id, 'UTF8')), 'hex');
update shade_finder_private.products p
  set database_brand_id = b.database_id,
    source_key = encode(sha256(convert_to('product:' || p.id, 'UTF8')), 'hex')
  from shade_finder_private.brands b where b.id = p.brand_id;
update shade_finder_private.shades s
  set database_product_id = p.database_id,
    source_key = encode(sha256(convert_to('shade:' || s.id, 'UTF8')), 'hex')
  from shade_finder_private.products p where p.id = s.product_id;

alter table shade_finder_private.shades drop constraint shades_product_id_fkey;
alter table shade_finder_private.products drop constraint products_brand_id_fkey;
alter table shade_finder_private.shades drop column id, drop column product_id;
alter table shade_finder_private.products drop column id, drop column brand_id;
alter table shade_finder_private.brands drop column id;

alter table shade_finder_private.brands rename column database_id to id;
alter table shade_finder_private.products rename column database_id to id;
alter table shade_finder_private.products rename column database_brand_id to brand_id;
alter table shade_finder_private.shades rename column database_id to id;
alter table shade_finder_private.shades rename column database_product_id to product_id;

alter table shade_finder_private.brands
  add primary key (id),
  alter column source_key set not null,
  add unique (source_key),
  add check (source_key ~ '^[0-9a-f]{64}$');
alter table shade_finder_private.products
  add primary key (id),
  alter column brand_id set not null,
  add foreign key (brand_id) references shade_finder_private.brands(id),
  alter column source_key set not null,
  add unique (source_key),
  add check (source_key ~ '^[0-9a-f]{64}$');
alter table shade_finder_private.shades
  add primary key (id),
  alter column product_id set not null,
  add foreign key (product_id) references shade_finder_private.products(id),
  alter column source_key set not null,
  add unique (source_key),
  add check (source_key ~ '^[0-9a-f]{64}$');

create index shade_products_brand_type_order_idx
  on shade_finder_private.products (brand_id, product_type, sort_order);
create index shade_shades_product_order_idx
  on shade_finder_private.shades (product_id, sort_order);

update shade_finder_private.imports
  set metadata = metadata - 'source_url' - 'source_app_url';

revoke all on shade_finder_private.brands, shade_finder_private.products,
  shade_finder_private.shades from public, anon, authenticated;
grant select (id, name, name_en) on shade_finder_private.brands to anon, authenticated;
grant select (id, brand_id, name, name_en, product_type, sort_order)
  on shade_finder_private.products to anon, authenticated;
grant select (id, product_id, name, hex, lab_l, lab_a, lab_b, sort_order)
  on shade_finder_private.shades to anon, authenticated;

create function public.shade_finder_brands()
returns table(id uuid, name text, name_en text, product_types public.shade_product_type[])
language sql stable security invoker set search_path = ''
as $$
  select b.id, b.name, b.name_en, array_agg(distinct p.product_type order by p.product_type)
  from shade_finder_private.brands b join shade_finder_private.products p on p.brand_id = b.id
  group by b.id, b.name, b.name_en order by b.id;
$$;

create function public.shade_finder_products(p_brand_id uuid, p_type public.shade_product_type default null)
returns table(id uuid, name text, name_en text, product_type public.shade_product_type)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_brand_id is null then
    raise exception 'Brand ID is required' using errcode = '22023';
  end if;
  if not exists (select 1 from shade_finder_private.brands b where b.id = p_brand_id) then
    raise exception 'Brand not found' using errcode = 'P0002';
  end if;
  return query select p.id, p.name, p.name_en, p.product_type
    from shade_finder_private.products p
    where p.brand_id = p_brand_id and (p_type is null or p.product_type = p_type)
    order by p.sort_order, p.id;
end;
$$;

create function public.shade_finder_shades(p_product_id uuid)
returns table(id uuid, name text, hex text)
language plpgsql stable security invoker set search_path = ''
as $$
begin
  if p_product_id is null then
    raise exception 'Product ID is required' using errcode = '22023';
  end if;
  if not exists (select 1 from shade_finder_private.products p where p.id = p_product_id) then
    raise exception 'Product not found' using errcode = 'P0002';
  end if;
  return query select s.id, s.name, s.hex from shade_finder_private.shades s
    where s.product_id = p_product_id order by s.sort_order, s.id;
end;
$$;

create function public.shade_finder_matches(
  p_shade_id uuid, p_type public.shade_product_type default null,
  p_brand_id uuid default null, p_offset integer default 0
) returns table(
  product_id uuid, product_name text, product_name_en text,
  product_type public.shade_product_type, brand_name text,
  shade_id uuid, shade_name text, hex text, delta_e double precision, total_count bigint
)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  source record;
begin
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
      p.product_type, b.name as brand_name, s.id as shade_id, s.name as shade_name, s.hex,
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
  )
  select n.*, count(*) over () from nearest n
  order by n.delta_e, n.product_id, n.shade_id
  limit 6 offset p_offset;
end;
$$;

revoke all on function public.shade_finder_brands() from public;
revoke all on function public.shade_finder_products(uuid, public.shade_product_type) from public;
revoke all on function public.shade_finder_shades(uuid) from public;
revoke all on function public.shade_finder_matches(uuid, public.shade_product_type, uuid, integer) from public;
grant execute on function public.shade_finder_brands() to anon, authenticated;
grant execute on function public.shade_finder_products(uuid, public.shade_product_type) to anon, authenticated;
grant execute on function public.shade_finder_shades(uuid) to anon, authenticated;
grant execute on function public.shade_finder_matches(uuid, public.shade_product_type, uuid, integer) to anon, authenticated;
