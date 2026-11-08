import assert from 'node:assert/strict';
import test from 'node:test';
import { Client } from 'pg';
import { applyCatalog, createImportPlan, createSeedSql, sourceKey, validateCatalog } from './import-shade-supabase.mjs';
import { deltaE2000, findSimilarShades, hexToRgb, rgbToLab } from '../src/features/shade-finder/matching.mjs';
import { createSyntheticCatalog, referencePairs } from './test-support/shade-fixture.mjs';

const catalog = createSyntheticCatalog();
catalog.brands[1].nameEn = 'AnotherBrand';
catalog.products.at(-1).nameEn = 'Faraway 100%_literal cushion';

test('complete catalog validates before typed SQL rows are produced', () => {
  const plan = createImportPlan(catalog);
  assert.equal(plan.brands.length, 2);
  assert.equal(plan.products.length, 28);
  assert.equal(plan.shades.length, 112);
  assert.match(plan.imports[0].catalog_sha256, /^[0-9a-f]{64}$/);
  assert.equal(plan.imports[0].metadata.counts.included_shades, 112);
  assert.deepEqual(Object.keys(plan.shades[0]), ['source_key', 'product_source_key', 'name', 'hex', 'lab_l', 'lab_a', 'lab_b', 'sort_order', 'import_sha256']);
  assert.equal(plan.brands[0].source_key, sourceKey('brand', catalog.brands[0].id));
  assert.equal(plan.products[0].brand_source_key, plan.brands[0].source_key);
  assert.equal(plan.shades[0].product_source_key, plan.products[0].source_key);
  assert.ok(!('source_url' in plan.imports[0].metadata));
  assert.ok(!('source_app_url' in plan.imports[0].metadata));
  const rgb = hexToRgb(plan.shades[0].hex);
  assert.deepEqual([plan.shades[0].lab_l, plan.shades[0].lab_a, plan.shades[0].lab_b], rgbToLab(rgb));
});

test('invalid types, extra keys, foreign keys, duplicate IDs, hex/RGB and counts are rejected', () => {
  const mutations = [
    c => { c.brands[0].name = 17; },
    c => { c.brands[0].name = '  '; },
    c => { c.brands[0].extra = 'unexpected'; },
    c => { c.brands[0].nameEn = null; },
    c => { c.products[0].type = 'other'; },
    c => { c.products[0].brandId = 'unknown'; },
    c => { c.products[1].id = c.products[0].id; },
    c => { c.products[0].shades[0].id = `${c.products[1].id}:bad`; },
    c => { c.products[0].shades[0].hex = '#ffffff'; },
    c => { c.products[0].shades[0].hex = '#ABCDEF'; },
    c => { c.products[0].shades[0].rgb[0] = NaN; },
    c => { c.products[0].shades[0].rgb[0] = 1.5; },
    c => { c.products[0].shades[0].rgb.push(0); },
    c => { c.products[0].shades = []; },
    c => { c.metadata.sourceSha256 = 'no'; },
    c => { c.metadata.capturedAt = '2026-02-30T13:37:20.708Z'; },
    c => { c.metadata.counts.includedShades += 1; },
    c => { c.metadata.counts.rawProducts += 1; },
    c => { c.metadata.sourceUrl = 'https://source.example.test'; },
  ];
  for (const mutate of mutations) {
    const broken = structuredClone(catalog);
    mutate(broken);
    assert.throws(() => validateCatalog(broken), TypeError);
  }
});

test('SQL artifact is atomic, escapes names, and performs only upserts', () => {
  const input = structuredClone(catalog);
  input.brands[0].name = "O'Brien \\ shade";
  const sql = createSeedSql(input);
  assert.match(sql, /begin;\nset local standard_conforming_strings = on;/);
  assert.ok(sql.includes("'O''Brien \\ shade'"));
  assert.match(sql, /on conflict \(source_key\) do update/);
  assert.ok(sql.includes('select id from shade_finder_private.brands where source_key ='));
  assert.ok(sql.includes('select id from shade_finder_private.products where source_key ='));
  for (const product of catalog.products) assert.ok(!sql.includes(`'${product.id}'`));
  assert.match(sql, /commit;\n$/);
  assert.doesNotMatch(sql, /\b(delete from|truncate|drop table)\b/i);
});

test('invalid import cannot begin a transaction, and a failed batch rolls back', async () => {
  const calls = [];
  const client = { async query(sql) { calls.push(sql); if (sql.startsWith('insert into')) throw new Error('batch failed'); } };
  await assert.rejects(applyCatalog(client, {}), TypeError);
  assert.equal(calls.length, 0);
  await assert.rejects(applyCatalog(client, catalog), /batch failed/);
  assert.equal(calls[0], 'begin');
  assert.equal(calls.at(-1), 'rollback');
  assert.ok(!calls.includes('commit'));
});

const databaseUrl = process.env.SHADE_TEST_DATABASE_URL;

test('PostgreSQL: invoker RPCs preserve ranks and enforce RLS, keys, enums and finite Lab', { skip: !databaseUrl }, async t => {
  // Require a migrated EMPTY local database. Only generated test records are read.
  // The entire suite rolls back, including the importer's nested transaction.
  const url = new URL(databaseUrl);
  assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'integration test requires a local database');
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query('begin');
  t.after(async () => {
    try { await client.query('rollback'); }
    finally { await client.end(); }
  });
  const empty = await client.query(`select
    not exists(select 1 from shade_finder_private.imports)
    and not exists(select 1 from shade_finder_private.brands)
    and not exists(select 1 from shade_finder_private.products)
    and not exists(select 1 from shade_finder_private.shades) as empty`);
  assert.equal(empty.rows[0].empty, true, 'create a fresh local test database; existing catalog data is never used by this suite');
  const importer = { query(sql, params) {
    const nested = { begin: 'savepoint shade_fixture_import', commit: 'release savepoint shade_fixture_import', rollback: 'rollback to savepoint shade_fixture_import' };
    return client.query(nested[sql] ?? sql, params);
  } };
  const imported = await applyCatalog(importer, catalog);
  assert.deepEqual(imported, { brands: 2, products: 28, shades: 112 });
  const readIds = async () => {
    const ids = {};
    for (const table of ['brands', 'products', 'shades']) {
      const parent = { products: ', brand_id', shades: ', product_id' }[table] ?? '';
      ids[table] = (await client.query(`select id, source_key${parent} from shade_finder_private.${table} order by source_key`)).rows;
    }
    return ids;
  };
  const originalIds = await readIds();
  const mappedId = (table, kind, id) => originalIds[table].find(row => row.source_key === sourceKey(kind, id)).id;
  const runtimeCatalog = {
    ...catalog,
    brands: catalog.brands.map(brand => ({ ...brand, id: mappedId('brands', 'brand', brand.id) })),
    products: catalog.products.map(product => ({
      ...product,
      id: mappedId('products', 'product', product.id),
      brandId: mappedId('brands', 'brand', product.brandId),
      shades: product.shades.map(shade => ({ ...shade, id: mappedId('shades', 'shade', shade.id) })),
    })),
  };
  const rejectQuery = async (sql, params, code) => {
    await client.query('savepoint shade_expected_error');
    try { await assert.rejects(client.query(sql, params), { code }); }
    finally {
      await client.query('rollback to savepoint shade_expected_error');
      await client.query('release savepoint shade_expected_error');
    }
  };

  await t.test('reimport keeps database UUIDs and all parent relationships', async () => {
    await applyCatalog(importer, catalog);
    assert.deepEqual(await readIds(), originalIds);
    for (const product of runtimeCatalog.products) {
      assert.equal(originalIds.products.find(row => row.id === product.id).brand_id, product.brandId);
      for (const shade of product.shades) assert.equal(originalIds.shades.find(row => row.id === shade.id).product_id, product.id);
    }
    for (const rows of Object.values(originalIds)) for (const row of rows) {
      assert.match(row.id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
      assert.match(row.source_key, /^[0-9a-f]{64}$/);
    }
  });

  await t.test('schema has RLS everywhere, no elevated functions, and private metadata', async () => {
    const { rows } = await client.query("select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='shade_finder_private' and c.relkind='r' order by c.relname");
    assert.deepEqual(rows.map(row => row.relname), ['brands', 'imports', 'products', 'shades']);
    assert.ok(rows.every(row => row.relrowsecurity));
    const functions = await client.query("select p.proname, p.prosecdef, p.proconfig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='shade_finder_private' or (n.nspname='public' and p.proname like 'shade_finder_%')");
    assert.equal(functions.rows.length, 7);
    assert.ok(functions.rows.every(row => !row.prosecdef && row.proconfig.includes('search_path=""')));
  });

  await t.test('both public roles can use bounded RPCs but cannot read metadata or write data', async () => {
    for (const role of ['anon', 'authenticated']) {
      await client.query(`set local role ${role}`);
      try {
        const brands = await client.query('select * from public.shade_finder_brands()');
        assert.equal(brands.rows.length, catalog.brands.length);
        assert.deepEqual(Object.keys(brands.rows[0]), ['id', 'name', 'name_en', 'product_types']);
        assert.ok(brands.rows.every(row => row.product_types.length > 0));
        await rejectQuery('select * from shade_finder_private.imports', [], '42501');
        for (const table of ['brands', 'products', 'shades']) {
          await rejectQuery(`select source_key from shade_finder_private.${table}`, [], '42501');
          await rejectQuery(`select import_sha256 from shade_finder_private.${table}`, [], '42501');
          await rejectQuery(`select * from shade_finder_private.${table}`, [], '42501');
          await rejectQuery(`delete from shade_finder_private.${table} where false`, [], '42501');
          await rejectQuery(`update shade_finder_private.${table} set name = name where false`, [], '42501');
        }
        await rejectQuery("insert into shade_finder_private.brands (name,name_en) values ('test','')", [], '42501');
      } finally { await client.query('reset role'); }
    }
  });

  await t.test('canonical HEX comparison, one match per product, filters, pages and deterministic ties', async () => {
    await client.query('set local role anon');
    try {
      const examples = [runtimeCatalog.products[0], runtimeCatalog.products[7], runtimeCatalog.products.at(-1)];
      for (const product of examples) {
        const shades = await client.query('select * from public.shade_finder_shades($1)', [product.id]);
        assert.deepEqual(shades.rows.map(row => row.id), product.shades.map(shade => shade.id));
        for (const filter of [{}, { type: 'foundation' }, { type: 'cushion', brandId: runtimeCatalog.brands[0].id }]) {
          const expected = findSimilarShades(runtimeCatalog, product.shades[0].id, { ...filter, limit: Infinity });
          for (const offset of [0, 6, 12, 30]) {
            const { rows } = await client.query('select * from public.shade_finder_matches($1,$2,$3,$4)', [product.shades[0].id, filter.type ?? null, filter.brandId ?? null, offset]);
            const expectedPage = expected.slice(offset, offset + 6);
            assert.deepEqual(rows.map(row => row.shade_id), expectedPage.map(match => match.shade.id));
            rows.forEach((row, index) => {
              assert.ok(Math.abs(row.delta_e - expectedPage[index].deltaE) < 1e-10);
              assert.equal(Number(row.total_count), expected.length);
              assert.notEqual(row.product_id, product.id);
            });
          }
        }
      }
    } finally { await client.query('reset role'); }
  });

  await t.test('search covers all nearest-product results before counting and pagination', async () => {
    const source = runtimeCatalog.products[0].shades[0];
    const ranked = findSimilarShades(runtimeCatalog, source.id, { limit: Infinity });
    const expectedMatches = (query, filters = {}) => {
      const tokens = (query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
      return ranked.filter(match => {
        const brand = runtimeCatalog.brands.find(item => item.id === match.product.brandId);
        const searchable = [brand.name, brand.nameEn, match.product.name, match.product.nameEn, match.shade.name]
          .join(' ').replace(/\s+/g, ' ').toLowerCase();
        return (!filters.type || match.product.type === filters.type)
          && (!filters.brandId || match.product.brandId === filters.brandId)
          && tokens.every(token => searchable.includes(token));
      });
    };
    const queryMatches = async (query, offset = 0, filters = {}) => (await client.query(
      'select * from public.shade_finder_matches($1,$2,$3,$4,$5)',
      [source.id, filters.type ?? null, filters.brandId ?? null, offset, query],
    )).rows;
    const cases = ['', null, '   ', '가상 브랜드', 'anotherbrand', 'ANOTHERBRAND', '파운데이션',
      'SYNTHETIC FOUNDATION', '색상', 'AnotherBrand 쿠션', '  AnotherBrand   쿠션  ',
      'Faraway', '100%_literal', '%', '_', 'missing-result', 'AnotherBrand nonexistent'];
    await client.query('set local role anon');
    try {
      for (const query of cases) {
        for (const filters of [{}, { type: 'cushion' }, { brandId: runtimeCatalog.brands[1].id }]) {
          const expected = expectedMatches(query, filters);
          for (const offset of [0, 6, 12, 30]) {
            const rows = await queryMatches(query, offset, filters);
            assert.deepEqual(rows.map(row => row.shade_id), expected.slice(offset, offset + 6).map(match => match.shade.id), `query=${query}, offset=${offset}`);
            for (const row of rows) {
              assert.equal(Number(row.total_count), expected.length);
              assert.deepEqual(Object.keys(row), ['product_id', 'product_name', 'product_name_en', 'product_type', 'brand_name', 'shade_id', 'shade_name', 'hex', 'delta_e', 'total_count']);
            }
          }
        }
      }
      const laterMatch = ranked[12];
      const laterQuery = laterMatch.product.nameEn;
      const rows = await queryMatches(laterQuery);
      assert.ok(rows.some(row => row.shade_id === laterMatch.shade.id), 'search must reach matches outside the initial six');
      const original = (await client.query('select * from public.shade_finder_matches($1)', [source.id])).rows;
      assert.deepEqual(await queryMatches(''), original);
      assert.deepEqual(await queryMatches(null), original);
      for (const query of ['x'.repeat(101), '😀'.repeat(101), 'word\nword', 'word\tword', 'word\rword', '\u0001', '\u007f']) {
        await rejectQuery('select * from public.shade_finder_matches($1,null,null,0,$2)', [source.id, query], '22023');
      }
      assert.deepEqual(await queryMatches('😀'.repeat(100)), []);
    } finally { await client.query('reset role'); }

    // A search for a less similar shade must never replace the nearest shade.
    const nearest = ranked[0];
    const other = nearest.product.shades.find(shade => shade.id !== nearest.shade.id);
    await client.query('savepoint shade_search_name');
    try {
      await client.query('update shade_finder_private.shades set name=$1 where id=$2', ['OnlyNonnearestShade', other.id]);
      await client.query('set local role authenticated');
      assert.deepEqual(await queryMatches('OnlyNonnearestShade'), []);
      assert.deepEqual((await queryMatches('가상')).map(row => row.shade_id), ranked.slice(0, 6).map(match => match.shade.id));
    } finally {
      await client.query('reset role');
      await client.query('rollback to savepoint shade_search_name');
      await client.query('release savepoint shade_search_name');
    }
  });

  await t.test('HEX RPC matches arbitrary colours without excluding products and retains filters/search/pages', async () => {
    const expectedMatches = (hex, filters = {}, query = '') => {
      const lab = rgbToLab(hexToRgb(hex));
      const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      return runtimeCatalog.products.filter(product => (!filters.type || product.type === filters.type) && (!filters.brandId || product.brandId === filters.brandId)).map(product => {
        const shades = product.shades.map(shade => ({ shade, deltaE: deltaE2000(lab, rgbToLab(hexToRgb(shade.hex))) }))
          .sort((a, b) => a.deltaE - b.deltaE || a.shade.id.localeCompare(b.shade.id));
        return { product, ...shades[0] };
      }).filter(match => {
        const brand = runtimeCatalog.brands.find(item => item.id === match.product.brandId);
        const text = [brand.name, brand.nameEn, match.product.name, match.product.nameEn, match.shade.name].join(' ').toLowerCase();
        return tokens.every(token => text.includes(token));
      }).sort((a, b) => a.deltaE - b.deltaE || a.product.id.localeCompare(b.product.id) || a.shade.id.localeCompare(b.shade.id));
    };
    for (const role of ['anon', 'authenticated']) {
      await client.query(`set local role ${role}`);
      try {
        for (const hex of ['#000000', '#ffffff', '#E5BDA0', '#0a0b0c', '#ff0000', '#00ff00', '#0000ff', runtimeCatalog.products[0].shades[0].hex]) {
          const converted = (await client.query('select shade_finder_private.hex_to_lab($1) as lab', [hex])).rows[0].lab;
          converted.forEach((value, index) => assert.ok(Math.abs(value - rgbToLab(hexToRgb(hex))[index]) < 1e-10));
          for (const filters of [{}, { type: 'cushion', brandId: runtimeCatalog.brands[0].id }]) {
            for (const query of ['', 'AnotherBrand', '100%_literal', '%', 'no-such-match']) {
              const expected = expectedMatches(hex, filters, query);
              for (const offset of [0, 6, 24, 30]) {
                const { rows } = await client.query('select * from public.shade_finder_matches_hex($1,$2,$3,$4,$5)', [hex, filters.type ?? null, filters.brandId ?? null, offset, query]);
                assert.deepEqual(rows.map(row => row.shade_id), expected.slice(offset, offset + 6).map(match => match.shade.id));
                rows.forEach((row, index) => {
                  assert.ok(Math.abs(row.delta_e - expected[offset + index].deltaE) < 1e-10);
                  assert.equal(Number(row.total_count), expected.length);
                });
              }
            }
          }
        }
        const source = runtimeCatalog.products[0];
        const exact = await client.query('select * from public.shade_finder_matches_hex($1)', [source.shades[0].hex]);
        assert.equal(Number(exact.rows[0].total_count), runtimeCatalog.products.length);
        assert.ok(exact.rows.some(row => row.product_id === source.id && row.delta_e < 1e-10));
        for (const hex of [null, '', '#fff', '#12345678', '123456', '#12345z', ' #123456', '#123456\n']) {
          await rejectQuery('select * from public.shade_finder_matches_hex($1)', [hex], '22023');
        }
        for (const offset of [null, -6, 1, 100002]) {
          await rejectQuery('select * from public.shade_finder_matches_hex($1,null,null,$2)', ['#e5bda0', offset], '22023');
        }
        await rejectQuery('select * from public.shade_finder_matches_hex($1,null,$2)', ['#e5bda0', '00000000-0000-4000-8000-000000000000'], 'P0002');
        for (const query of ['x'.repeat(101), 'a\nb', 'a\tb']) {
          await rejectQuery('select * from public.shade_finder_matches_hex($1,null,null,0,$2)', ['#e5bda0', query], '22023');
        }
      } finally { await client.query('reset role'); }
    }
  });

  await t.test('SQL colour math agrees with all 34 published CIEDE2000 references', async () => {
    assert.equal(referencePairs.length, 34);
    for (const pair of referencePairs) {
      for (const args of [pair.slice(0, 6), [...pair.slice(3, 6), ...pair.slice(0, 3)]]) {
        const result = await client.query('select shade_finder_private.delta_e_2000($1,$2,$3,$4,$5,$6) as delta', args);
        assert.ok(Math.abs(result.rows[0].delta - pair[6]) < 0.00005);
        assert.ok(Math.abs(result.rows[0].delta - deltaE2000(args.slice(0, 3), args.slice(3))) < 1e-10);
      }
    }
  });

  await t.test('legacy IDs and invalid UUID RPC input are rejected', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    await rejectQuery('select * from public.shade_finder_shades($1)', [missing], 'P0002');
    await rejectQuery('select * from public.shade_finder_products($1)', [missing], 'P0002');
    await rejectQuery('select * from public.shade_finder_matches($1)', [missing], 'P0002');
    await rejectQuery('select * from public.shade_finder_matches($1,null,null,1)', [missing], '22023');
    await rejectQuery('select * from public.shade_finder_products(null)', [], '22023');
    await rejectQuery("select * from public.shade_finder_products($1,'wrong')", [runtimeCatalog.brands[0].id], '22P02');
    await rejectQuery('select * from public.shade_finder_products($1)', [catalog.brands[0].id], '22P02');
    await rejectQuery('select * from public.shade_finder_shades($1)', [catalog.products[0].id], '22P02');
    await rejectQuery('select * from public.shade_finder_matches($1)', [catalog.products[0].shades[0].id], '22P02');
  });

  await t.test('database constraints reject invalid HEX, nonfinite Lab, empty names and broken references', async () => {
    const shadeId = runtimeCatalog.products[0].shades[0].id;
    const attempts = [
      ["update shade_finder_private.shades set hex='#ABCDEF' where id=$1", [shadeId], '23514'],
      ["update shade_finder_private.shades set lab_l='NaN'::float8 where id=$1", [shadeId], '23514'],
      ["update shade_finder_private.shades set lab_a='Infinity'::float8 where id=$1", [shadeId], '23514'],
      ["update shade_finder_private.shades set name='' where id=$1", [shadeId], '23514'],
      ["update shade_finder_private.products set brand_id='00000000-0000-4000-8000-000000000000' where id=$1", [runtimeCatalog.products[0].id], '23503'],
      ["update shade_finder_private.shades set source_key='bad' where id=$1", [shadeId], '23514'],
      ["update shade_finder_private.brands set source_key=$1 where id=$2", [originalIds.brands[0].source_key, originalIds.brands[1].id], '23505'],
    ];
    for (const [sql, params, code] of attempts) {
      await rejectQuery(sql, params, code);
    }
  });
});
