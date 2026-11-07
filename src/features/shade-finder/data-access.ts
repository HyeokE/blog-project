import 'server-only';

import { serverSupabaseClient } from '@/lib/supabase/server';
import type { Database } from './database.types';
import { normalizeBrands, normalizeMatches, normalizeProducts, normalizeShades } from './normalize';
import { parseShadeFinderBootstrap } from './public-contracts';
import type { MatchesResponse, ProductFilter, ProductsResponse, ShadeFinderBootstrap, ShadesResponse } from './public-types';

export class CatalogReadError extends Error {
  constructor(public readonly status: 400 | 404 | 503) {
    super(status === 400 ? 'Invalid shade request.' : status === 404 ? 'Shade selection not found.' : 'Shade catalog is unavailable.');
    this.name = 'CatalogReadError';
  }
}

interface ShadeRepository {
  readBootstrap(): Promise<ShadeFinderBootstrap>;
  readProducts(brandId: string, type: ProductFilter): Promise<ProductsResponse>;
  readShades(productId: string): Promise<ShadesResponse>;
  readMatches(shadeId: string, type: ProductFilter, brandId: string | undefined, offset: number, query?: string): Promise<MatchesResponse>;
}

type RpcResult<T> = { data: T | null; error: { code: string } | null };

async function readResult<T, Result>(operation: () => PromiseLike<RpcResult<T>>, normalize: (rows: T) => Result): Promise<Result> {
  try {
    const { data, error } = await operation();
    if (error) {
      throw new CatalogReadError(error.code === '22023' || error.code === '22P02' ? 400 : error.code === 'P0002' ? 404 : 503);
    }
    if (data === null) {
      throw new CatalogReadError(503);
    }
    return normalize(data);
  } catch (error) {
    if (error instanceof CatalogReadError) {throw error;}
    throw new CatalogReadError(503);
  }
}

/** One cookie-authenticated, RLS-bound client per request; no shared identity cache. */
export async function createShadeRepository(): Promise<ShadeRepository> {
  try {
    const client = await serverSupabaseClient<Database>();
    const { error } = await client.auth.getUser();
    if (error && error.name !== 'AuthSessionMissingError') {
      throw new CatalogReadError(503);
    }

    const readProducts = (brandId: string, type: ProductFilter) => readResult(() => client.rpc('shade_finder_products', {
      p_brand_id: brandId,
      ...(type === 'all' ? {} : { p_type: type }),
    }), normalizeProducts);
    const readShades = (productId: string) => readResult(() => client.rpc('shade_finder_shades', { p_product_id: productId }), normalizeShades);

    async function readMatches(shadeId: string, type: ProductFilter, brandId: string | undefined, offset: number, query = ''): Promise<MatchesResponse> {
      const args: Database['public']['Functions']['shade_finder_matches']['Args'] = {
        p_shade_id: shadeId,
        p_offset: offset,
        ...(query === '' ? {} : { p_query: query }),
        ...(type === 'all' ? {} : { p_type: type }),
        ...(brandId === undefined ? {} : { p_brand_id: brandId }),
      };
      const result = await readResult(() => client.rpc('shade_finder_matches', args), rows => normalizeMatches(rows, offset));
      if (offset > 0 && result.matches.length === 0) {
        // A table-returning RPC has no count row beyond the final page.
        const firstPage = await readResult(() => client.rpc('shade_finder_matches', { ...args, p_offset: 0 }), rows => normalizeMatches(rows, 0));
        return { matches: [], total: firstPage.total, nextOffset: null };
      }
      return result;
    }

    async function readBootstrap(): Promise<ShadeFinderBootstrap> {
      const brands = await readResult(() => client.rpc('shade_finder_brands'), normalizeBrands);
      const preferredBrand = brands.find(brand => brand.name === '헤라');
      const orderedBrands = preferredBrand ? [preferredBrand, ...brands.filter(brand => brand.id !== preferredBrand.id)] : brands;
      for (const brand of orderedBrands) {
        const { products } = await readProducts(brand.id, 'all');
        const preferredProduct = products.find(product => product.name.includes('블랙 쿠션'));
        const orderedProducts = preferredProduct ? [preferredProduct, ...products.filter(product => product.id !== preferredProduct.id)] : products;
        for (const product of orderedProducts) {
          const { shades } = await readShades(product.id);
          const shade = shades.find(candidate => /21N1|21N|21호/.test(candidate.name)) ?? shades[0];
          if (shade) {
            return parseShadeFinderBootstrap({ brands, example: { brand, product, shade } });
          }
        }
      }
      return { brands, example: null };
    }

    return { readBootstrap, readProducts, readShades, readMatches };
  } catch (error) {
    if (error instanceof CatalogReadError) {throw error;}
    throw new CatalogReadError(503);
  }
}
