import type { Database } from './database.types';

export type ProductType = Database['public']['Enums']['shade_product_type'];
export type ProductFilter = ProductType | 'all';

export interface BrandOption {
  id: string;
  name: string;
  nameEn: string;
  types: ProductType[];
}

export interface ProductOption {
  id: string;
  name: string;
  nameEn: string;
  type: ProductType;
}

export interface ShadeOption {
  id: string;
  name: string;
  hex: string;
}

export interface MatchView {
  product: ProductOption;
  brandName: string;
  shade: ShadeOption;
  deltaE: number;
}

export interface ShadeFinderBootstrap {
  brands: BrandOption[];
  example: {
    brand: BrandOption;
    product: ProductOption;
    shade: ShadeOption;
  } | null;
}

export interface ProductsResponse {
  products: ProductOption[];
}

export interface ShadesResponse {
  shades: ShadeOption[];
}

export interface MatchesResponse {
  matches: MatchView[];
  total: number;
  nextOffset: number | null;
}
