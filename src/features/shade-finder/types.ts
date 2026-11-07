export type { ProductType } from './public-types';
import type { ProductType } from './public-types';
export type Rgb = readonly [number, number, number];
export type Lab = readonly [number, number, number];

export interface Shade {
  id: string;
  name: string;
  rgb: Rgb;
  hex: string;
}

export interface ShadeBrand {
  id: string;
  name: string;
  nameEn: string;
}

export interface ShadeProduct {
  id: string;
  brandId: string;
  name: string;
  nameEn: string;
  type: ProductType;
  shades: Shade[];
}

export interface ShadeCatalog {
  metadata: {
    sourceFile: string;
    sourceSha256: string;
    capturedAt: string;
    scope: string;
    swatchNote: string;
    inclusionRule: string;
    counts: {
      rawBrands: number;
      rawProducts: number;
      rawShades: number;
      uniqueShades: number;
      duplicateShadesRemoved: number;
      includedBrands: number;
      includedProducts: number;
      includedShades: number;
      excludedProducts: number;
      emptyProducts: number;
      foundationProducts: number;
      cushionProducts: number;
    };
  };
  brands: ShadeBrand[];
  products: ShadeProduct[];
}

export interface ShadeFilters {
  type?: ProductType | 'all';
  brandId?: string;
  limit?: number;
}

export interface ShadeMatch {
  product: ShadeProduct;
  shade: Shade;
  deltaE: number;
}
