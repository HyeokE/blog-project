import type { ProductFilter } from './public-types';
export type ShadeUrlState = { selectionType: ProductFilter; brandId: string; productId: string; shadeId: string; type: ProductFilter; brand: string; q: string };
export type ShadeUrlAction =
  | { kind: 'selectionType' | 'type'; value: ProductFilter }
  | { kind: 'brandId' | 'productId' | 'shadeId' | 'brand' | 'q'; value: string }
  | { kind: 'example'; brandId: string; productId: string; shadeId: string }
  | { kind: 'sourceReset' | 'resultsReset' };
export function readShadeUrlState(search: string): ShadeUrlState;
export function writeShadeUrlState(search: string, state: ShadeUrlState): string;
export function updateShadeUrlState(state: ShadeUrlState, action: ShadeUrlAction): ShadeUrlState;
