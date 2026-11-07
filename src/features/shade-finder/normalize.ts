import type { Database } from './database.types';
import { parseMatchesResponse, parseProductsResponse, parseShadeFinderBootstrap, parseShadesResponse } from './public-contracts';
import type { BrandOption, MatchesResponse, ProductsResponse, ShadesResponse } from './public-types';

type Functions = Database['public']['Functions'];
type BrandRows = Functions['shade_finder_brands']['Returns'];
type ProductRows = Functions['shade_finder_products']['Returns'];
type ShadeRows = Functions['shade_finder_shades']['Returns'];
type MatchRows = Functions['shade_finder_matches']['Returns'];

// Raw RPC fields are translated exactly once, beside the database calls.
export function normalizeBrands(rows: BrandRows): BrandOption[] {
  return parseShadeFinderBootstrap({
    brands: rows.map(row => ({
      id: row.id,
      name: row.name,
      nameEn: row.name_en,
      types: row.product_types,
    })),
    example: null,
  }).brands.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function normalizeProducts(rows: ProductRows): ProductsResponse {
  return parseProductsResponse({
    products: rows.map(row => ({
      id: row.id,
      name: row.name,
      nameEn: row.name_en,
      type: row.product_type,
    })),
  });
}

export function normalizeShades(rows: ShadeRows): ShadesResponse {
  return parseShadesResponse({
    shades: rows.map(row => ({ id: row.id, name: row.name, hex: row.hex })),
  });
}

export function normalizeMatches(rows: MatchRows, offset: number): MatchesResponse {
  if (!Number.isSafeInteger(offset) || offset < 0 || offset % 6 !== 0) {
    throw new TypeError('Invalid shade page offset.');
  }
  const total = rows[0]?.total_count ?? 0;
  if (rows.some(row => row.total_count !== total)) {
    throw new TypeError('Inconsistent shade result count.');
  }
  return parseMatchesResponse({
    matches: rows.map(row => ({
      product: {
        id: row.product_id,
        name: row.product_name,
        nameEn: row.product_name_en,
        type: row.product_type,
      },
      brandName: row.brand_name,
      shade: { id: row.shade_id, name: row.shade_name, hex: row.hex },
      deltaE: row.delta_e,
    })),
    total,
    nextOffset: offset + rows.length < total ? offset + 6 : null,
  });
}
