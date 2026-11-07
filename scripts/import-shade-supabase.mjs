import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hexToRgb, rgbToLab } from '../src/features/shade-finder/matching.mjs';
import { externalShadeDataPath } from './shade-data-paths.mjs';

const codePattern = /^[A-Za-z0-9_-]+$/;
const shaPattern = /^[0-9a-f]{64}$/;
const metadataKeys = ['sourceFile', 'sourceSha256', 'capturedAt', 'scope', 'swatchNote', 'inclusionRule', 'counts'];
const countKeys = ['rawBrands', 'rawProducts', 'rawShades', 'uniqueShades', 'duplicateShadesRemoved', 'includedBrands', 'includedProducts', 'includedShades', 'excludedProducts', 'emptyProducts', 'foundationProducts', 'cushionProducts'];

function fail(path, reason) { throw new TypeError(`${path}: ${reason}`); }
function object(value, path, keys) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(path, 'expected object');
  if (Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) fail(path, 'unexpected or missing properties');
}
function string(value, path, allowEmpty = false) {
  if (typeof value !== 'string' || value.includes('\0') || (!allowEmpty && value.trim().length === 0)) fail(path, 'expected string');
}
function list(value, path) { if (!Array.isArray(value) || value.length === 0) fail(path, 'expected nonempty array'); }
function uniqueId(value, path, seen, segments) {
  string(value, path);
  const parts = value.split(':');
  if (parts.length !== segments || parts.some(part => !codePattern.test(part))) fail(path, 'invalid source ID');
  if (seen.has(value)) fail(path, 'duplicate ID');
  seen.add(value);
}

/** Reject malformed/extra data before computing or submitting any database row. */
export function validateCatalog(input) {
  object(input, 'catalog', ['metadata', 'brands', 'products']);
  object(input.metadata, 'metadata', metadataKeys);
  for (const key of metadataKeys.filter(key => key !== 'counts')) string(input.metadata[key], `metadata.${key}`);
  if (!shaPattern.test(input.metadata.sourceSha256)) fail('metadata.sourceSha256', 'expected lowercase SHA256');
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(input.metadata.capturedAt)
    || !Number.isFinite(Date.parse(input.metadata.capturedAt))
    || new Date(input.metadata.capturedAt).toISOString() !== input.metadata.capturedAt.replace(/Z$/, input.metadata.capturedAt.includes('.') ? 'Z' : '.000Z')) {
    fail('metadata.capturedAt', 'expected valid UTC timestamp');
  }
  const counts = input.metadata.counts;
  object(counts, 'metadata.counts', countKeys);
  for (const key of countKeys) if (!Number.isSafeInteger(counts[key]) || counts[key] < 0) fail(`metadata.counts.${key}`, 'expected nonnegative safe integer');
  list(input.brands, 'brands');
  list(input.products, 'products');
  const brandIds = new Set();
  for (const [index, brand] of input.brands.entries()) {
    const path = `brands[${index}]`;
    object(brand, path, ['id', 'name', 'nameEn']);
    uniqueId(brand.id, `${path}.id`, brandIds, 1);
    string(brand.name, `${path}.name`);
    string(brand.nameEn, `${path}.nameEn`, true);
  }
  const productIds = new Set();
  const shadeIds = new Set();
  const usedBrandIds = new Set();
  let foundationProducts = 0;
  for (const [index, product] of input.products.entries()) {
    const path = `products[${index}]`;
    object(product, path, ['id', 'brandId', 'name', 'nameEn', 'type', 'shades']);
    uniqueId(product.id, `${path}.id`, productIds, 2);
    string(product.brandId, `${path}.brandId`);
    if (!brandIds.has(product.brandId) || product.id.split(':')[0] !== product.brandId) fail(`${path}.brandId`, 'unknown or inconsistent brand');
    usedBrandIds.add(product.brandId);
    string(product.name, `${path}.name`);
    string(product.nameEn, `${path}.nameEn`, true);
    if (product.type !== 'foundation' && product.type !== 'cushion') fail(`${path}.type`, 'invalid product type');
    if (product.type === 'foundation') foundationProducts += 1;
    list(product.shades, `${path}.shades`);
    for (const [shadeIndex, shade] of product.shades.entries()) {
      const shadePath = `${path}.shades[${shadeIndex}]`;
      object(shade, shadePath, ['id', 'name', 'rgb', 'hex']);
      uniqueId(shade.id, `${shadePath}.id`, shadeIds, 3);
      if (!shade.id.startsWith(`${product.id}:`)) fail(`${shadePath}.id`, 'inconsistent product');
      string(shade.name, `${shadePath}.name`);
      if (typeof shade.hex !== 'string' || !/^#[0-9a-f]{6}$/.test(shade.hex)) fail(`${shadePath}.hex`, 'expected lowercase six-digit HEX');
      if (!Array.isArray(shade.rgb) || shade.rgb.length !== 3 || shade.rgb.some(channel => !Number.isInteger(channel) || channel < 0 || channel > 255)) fail(`${shadePath}.rgb`, 'expected three integer channels in 0..255');
      if (hexToRgb(shade.hex).some((channel, channelIndex) => channel !== shade.rgb[channelIndex])) fail(`${shadePath}.rgb`, 'RGB does not match canonical HEX');
    }
  }
  if (brandIds.size !== usedBrandIds.size) fail('brands', 'contains a brand without products');
  const actual = { includedBrands: brandIds.size, includedProducts: productIds.size, includedShades: shadeIds.size, foundationProducts, cushionProducts: productIds.size - foundationProducts };
  for (const [key, value] of Object.entries(actual)) if (counts[key] !== value) fail(`metadata.counts.${key}`, 'catalog count mismatch');
  if (counts.rawBrands < counts.includedBrands || counts.rawProducts !== counts.includedProducts + counts.excludedProducts
    || counts.rawShades !== counts.uniqueShades + counts.duplicateShadesRemoved || counts.uniqueShades < counts.includedShades
    || counts.emptyProducts > counts.excludedProducts) fail('metadata.counts', 'inconsistent source counts');
  return input;
}

export const sourceKey = (kind, id) => createHash('sha256').update(`${kind}:${id}`).digest('hex');

const snakeCase = key => key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

/** This is the single boundary where validated catalog fields become SQL row names. */
export function createImportPlan(input) {
  const catalog = validateCatalog(input);
  const importSha256 = catalog.metadata.sourceSha256;
  const metadata = Object.fromEntries(Object.entries(catalog.metadata).map(([key, value]) => [snakeCase(key), key === 'counts' ? Object.fromEntries(Object.entries(value).map(([countKey, count]) => [snakeCase(countKey), count])) : value]));
  const imports = [{ source_sha256: importSha256, catalog_sha256: createHash('sha256').update(JSON.stringify(catalog)).digest('hex'), captured_at: catalog.metadata.capturedAt, metadata }];
  const brands = catalog.brands.map(brand => ({ source_key: sourceKey('brand', brand.id), name: brand.name, name_en: brand.nameEn, import_sha256: importSha256 }));
  const products = catalog.products.map((product, sortOrder) => ({ source_key: sourceKey('product', product.id), brand_source_key: sourceKey('brand', product.brandId), name: product.name, name_en: product.nameEn, product_type: product.type, sort_order: sortOrder, import_sha256: importSha256 }));
  const shades = catalog.products.flatMap(product => product.shades.map((shade, sortOrder) => {
    const [labL, labA, labB] = rgbToLab(hexToRgb(shade.hex));
    if (![labL, labA, labB].every(Number.isFinite)) fail('Lab', 'nonfinite conversion');
    return { source_key: sourceKey('shade', shade.id), product_source_key: sourceKey('product', product.id), name: shade.name, hex: shade.hex, lab_l: labL, lab_a: labA, lab_b: labB, sort_order: sortOrder, import_sha256: importSha256 };
  }));
  return { imports, brands, products, shades };
}

function batches(plan) {
  return Object.entries(plan).flatMap(([table, rows]) => {
    const columns = Object.keys(rows[0]);
    const conflictColumn = table === 'imports' ? 'source_sha256' : 'source_key';
    const sqlColumns = columns.map(column => column.replace(/^(brand|product)_source_key$/, '$1_id'));
    const updates = sqlColumns.filter(column => column !== conflictColumn).map(column => `${column} = excluded.${column}`).join(', ');
    const parts = [];
    for (let offset = 0; offset < rows.length; offset += 250) parts.push({ prefix: `insert into shade_finder_private.${table} (${sqlColumns.join(', ')}) values `, suffix: ` on conflict (${conflictColumn}) do update set ${updates}`, columns, rows: rows.slice(offset, offset + 250) });
    return parts;
  });
}

function reference(column, expression) {
  const parent = { brand_source_key: 'brands', product_source_key: 'products' }[column];
  return parent ? `(select id from shade_finder_private.${parent} where source_key = ${expression})` : expression;
}

function literal(value) {
  if (typeof value === 'number') return String(value);
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  return `'${serialized.replaceAll("'", "''")}'`;
}

/** Offline SQL artifact for review / SQL Editor; full validation always runs first. */
export function createSeedSql(input) {
  const plan = createImportPlan(input);
  const statements = batches(plan).map(batch => `${batch.prefix}\n${batch.rows.map(row => `(${batch.columns.map(column => reference(column, literal(row[column]))).join(', ')})`).join(',\n')}${batch.suffix};`);
  return `-- Validated Shade Finder catalog. Upserts only; no deletions.\nbegin;\nset local standard_conforming_strings = on;\nselect pg_catalog.pg_advisory_xact_lock(1936220516, 1);\n${statements.join('\n')}\ncommit;\n`;
}

/** Caller supplies an admin connection explicitly; runtime never uses this connection. */
export async function applyCatalog(client, input) {
  const plan = createImportPlan(input);
  await client.query('begin');
  try {
    await client.query('select pg_catalog.pg_advisory_xact_lock(1936220516, 1)');
    for (const batch of batches(plan)) {
      const values = [];
      const placeholders = batch.rows.map(row => `(${batch.columns.map(column => {
        const value = row[column];
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
        return reference(column, `$${values.length}`);
      }).join(', ')})`).join(', ');
      await client.query(`${batch.prefix}${placeholders}${batch.suffix}`, values);
    }
    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
  return { brands: plan.brands.length, products: plan.products.length, shades: plan.shades.length };
}

async function main() {
  const args = process.argv.slice(2);
  let catalogPath;
  let outputPath = '/tmp/shade-finder-seed.sql';
  let apply = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--apply') apply = true;
    else if (arg === '--dry-run') apply = false;
    else if (arg === '--catalog' || arg === '--output') {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`${arg} needs a path`);
      if (arg === '--catalog') catalogPath = resolve(args[++index]);
      else outputPath = resolve(args[++index]);
    } else throw new TypeError('Usage: node scripts/import-shade-supabase.mjs --catalog <external-file.json> [--dry-run --output <external-file.sql> | --apply]');
  }
  if (!catalogPath) throw new TypeError('--catalog requires an external catalog file; no dataset is stored in this repository.');
  catalogPath = await externalShadeDataPath(catalogPath);
  if (!apply) outputPath = await externalShadeDataPath(outputPath);
  if (!apply && catalogPath === outputPath) throw new TypeError('Catalog and output must be different files.');
  const catalog = validateCatalog(JSON.parse(await readFile(catalogPath, 'utf8')));
  if (!apply) {
    await writeFile(outputPath, createSeedSql(catalog), { mode: 0o600 });
    console.log(JSON.stringify({ mode: 'dry-run', output: outputPath, brands: catalog.brands.length, products: catalog.products.length, shades: catalog.metadata.counts.includedShades }));
    return;
  }
  const connectionString = process.env.SHADE_IMPORT_DATABASE_URL;
  if (!connectionString) throw new Error('--apply requires explicitly supplied SHADE_IMPORT_DATABASE_URL');
  const { Client } = await import('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000, application_name: 'shade-catalog-import' });
  try {
    await client.connect();
    console.log(JSON.stringify({ mode: 'applied', ...await applyCatalog(client, catalog) }));
  } finally { await client.end(); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    // Do not echo driver errors that may contain a connection URL or credentials.
    console.error(error instanceof TypeError ? error.message : `Shade import failed${typeof error.code === 'string' ? ` (${error.code})` : ''}. Check the input, database connection, and applied migration.`);
    process.exitCode = 1;
  });
}
