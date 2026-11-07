import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { externalShadeDataPath } from './shade-data-paths.mjs';

function text(value) {
  return String(value ?? '')
    .replace(/&#(?:x([\da-f]+)|(\d+));/gi, (_, hex, decimal) =>
      String.fromCodePoint(Number.parseInt(hex ?? decimal, hex ? 16 : 10)),
    )
    .replace(
      /&(?:amp|quot|apos|lt|gt|nbsp);/g,
      (entity) =>
        ({
          '&amp;': '&',
          '&quot;': '"',
          '&apos;': "'",
          '&lt;': '<',
          '&gt;': '>',
          '&nbsp;': ' ',
        })[entity],
    )
    .trim();
}

const compareId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function code(value) {
  const result = text(value);
  if (!/^[a-z\d_-]+$/i.test(result)) throw new Error('Missing or invalid source code');
  return result;
}

function rows(response) {
  if (String(response?.resultCode) !== '200' || !Array.isArray(response.rows)) {
    throw new Error('Incomplete source response');
  }
  if (Number(response.totalcnt) !== response.rows.length) {
    throw new Error('Source response row count mismatch');
  }
  return response.rows;
}

/** Conservative name-based inclusion; ambiguous base makeup stays outside the catalog. */
export function classifyProduct(name) {
  if (/쿠션|\bcushion\b/i.test(name)) return 'cushion';
  if (/파운데이션|\bfoundation\b/i.test(name)) return 'foundation';
  return null;
}

export function normalizeCatalog(raw, sourceSha256, sourceFile = 'shade-catalog-raw.json') {
  if (raw.audit?.failed?.length || raw.audit?.mismatches?.length) {
    throw new Error('Source audit reports incomplete collection');
  }
  if (!raw.metadata?.finishedAt || !Number.isFinite(Date.parse(raw.metadata.finishedAt))) {
    throw new Error('Source capture date is required');
  }
  const brandRows = rows(raw.brandResponse);
  const brandMap = new Map();
  for (const row of brandRows) {
    const id = code(row.BRANDCD);
    if (brandMap.has(id)) throw new Error(`Duplicate brand ${id}`);
    brandMap.set(id, {
      id,
      name: text(row.BRANDNM_KO || row.BRANDNM || row.BRANDNM_EN),
      nameEn: text(row.BRANDNM_EN),
    });
  }

  const productMap = new Map();
  const brandResponses = new Set();
  for (const entry of raw.productResponses) {
    const brandId = code(entry.BRANDCD);
    if (!brandMap.has(brandId) || brandResponses.has(brandId)) {
      throw new Error(`Unknown or repeated brand response ${brandId}`);
    }
    brandResponses.add(brandId);
    for (const row of rows(entry.response)) {
      if (code(row.BRANDCD) !== brandId) throw new Error('Product brand mismatch');
      const id = `${brandId}:${code(row.PRODUCTCD)}`;
      if (productMap.has(id)) throw new Error(`Duplicate product ${id}`);
      const name = text(row.PRODUCTNM_KO || row.PRODUCTNM || row.PRODUCTNM_EN);
      const nameEn = text(row.PRODUCTNM_EN);
      productMap.set(id, {
        id,
        brandId,
        name,
        nameEn,
        type: classifyProduct(`${name} ${nameEn}`),
        shades: [],
      });
    }
  }
  if (brandResponses.size !== brandMap.size) throw new Error('Missing brand responses');

  let rawShades = 0;
  let duplicateShadesRemoved = 0;
  const shadeMap = new Map();
  const productResponses = new Set();
  for (const entry of raw.itemResponses) {
    const productId = `${code(entry.BRANDCD)}:${code(entry.PRODUCTCD)}`;
    if (!productMap.has(productId) || productResponses.has(productId)) {
      throw new Error(`Unknown or repeated product response ${productId}`);
    }
    productResponses.add(productId);
    for (const row of rows(entry.response)) {
      rawShades += 1;
      if (`${code(row.BRANDCD)}:${code(row.PRODUCTCD)}` !== productId) {
        throw new Error('Shade product mismatch');
      }
      const id = `${productId}:${code(row.ITEMCD)}`;
      const rgb = [row.RGB_R, row.RGB_G, row.RGB_B].map((value) => {
        if (value == null || String(value).trim() === '') throw new Error(`Missing RGB for ${id}`);
        const channel = Number(value);
        if (!Number.isInteger(channel) || channel < 0 || channel > 255) {
          throw new Error(`Invalid RGB for ${id}`);
        }
        return channel;
      });
      const name = text(row.ITEMCOLORNO_KO || row.ITEMCOLORNO || row.ITEMCOLORNO_EN);
      if (!name) throw new Error(`Missing shade name for ${id}`);
      const shade = {
        id,
        name,
        rgb,
        hex: `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`,
      };
      const previous = shadeMap.get(id);
      if (previous) {
        if (previous.shade.hex !== shade.hex) throw new Error(`Conflicting duplicate shade ${id}`);
        duplicateShadesRemoved += 1;
        // Prefer a localized label, with lexical fallback independent of response order.
        const score = (label) => (/[가-힣]/.test(label) ? 1 : 0);
        if (
          score(name) > score(previous.shade.name) ||
          (score(name) === score(previous.shade.name) && compareId(name, previous.shade.name) < 0)
        ) {
          previous.shade.name = name;
        }
      } else {
        shadeMap.set(id, { productId, order: Number(row.ITEMORD) || 0, shade });
      }
    }
  }
  if (productResponses.size !== productMap.size) throw new Error('Missing product responses');
  for (const entry of [...shadeMap.values()].sort(
    (a, b) => a.order - b.order || compareId(a.shade.id, b.shade.id),
  )) {
    productMap.get(entry.productId).shades.push(entry.shade);
  }

  const allProducts = [...productMap.values()];
  const products = allProducts
    .filter((product) => product.type !== null && product.shades.length > 0)
    .sort((a, b) => compareId(a.id, b.id));
  const includedBrandIds = new Set(products.map((product) => product.brandId));
  const brands = [...brandMap.values()]
    .filter((brand) => includedBrandIds.has(brand.id))
    .sort((a, b) => compareId(a.id, b.id));
  return {
    metadata: {
      sourceFile: basename(sourceFile),
      sourceSha256,
      capturedAt: raw.metadata.finishedAt,
      scope: 'Input-selector catalog only; no source-site recommendations are included.',
      swatchNote:
        'Source website RGB swatches, assumed sRGB; not measured product colors or skin matches.',
      inclusionRule:
        'Explicit cushion or foundation in Korean/English product names; cushion takes precedence; products with no shades excluded.',
      counts: {
        rawBrands: brandRows.length,
        rawProducts: allProducts.length,
        rawShades,
        uniqueShades: shadeMap.size,
        duplicateShadesRemoved,
        includedBrands: brands.length,
        includedProducts: products.length,
        includedShades: products.reduce((total, product) => total + product.shades.length, 0),
        excludedProducts: allProducts.length - products.length,
        emptyProducts: allProducts.filter((product) => product.shades.length === 0).length,
        foundationProducts: products.filter((product) => product.type === 'foundation').length,
        cushionProducts: products.filter((product) => product.type === 'cushion').length,
      },
    },
    brands,
    products,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [sourceArgument, outputArgument, ...extra] = process.argv.slice(2);
  if (!sourceArgument || !outputArgument || extra.length)
    throw new Error('Usage: node scripts/import-shade-catalog.mjs <external-raw.json> <external-output.json>');
  const sourcePath = await externalShadeDataPath(sourceArgument);
  const outputPath = await externalShadeDataPath(outputArgument);
  if (sourcePath === outputPath) throw new Error('Source and output must be different files.');
  const source = await readFile(sourcePath);
  const hash = createHash('sha256').update(source).digest('hex');
  const catalog = normalizeCatalog(JSON.parse(source.toString('utf8')), hash, sourcePath);
  // One product per line keeps the external import artifact inspectable.
  const output = `{
  "metadata": ${JSON.stringify(catalog.metadata, null, 2).replace(/\n/g, '\n  ')},
  "brands": [\n${catalog.brands.map((brand) => `    ${JSON.stringify(brand)}`).join(',\n')}\n  ],
  "products": [\n${catalog.products.map((product) => `    ${JSON.stringify(product)}`).join(',\n')}\n  ]
}\n`;
  await writeFile(outputPath, output);
  console.log(JSON.stringify(catalog.metadata.counts, null, 2));
}
