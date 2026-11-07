'use client';

import { ANALYTICS_EVENTS, type AnalyticsEvent } from '@/constants/analytics';
import { trackEvent } from '@/utils/analytics';
import { isShadeId } from './public-contracts';
import type { MatchView, ProductFilter } from './public-types';

const actions = ['view', 'example_select', 'selection_type', 'brand_select', 'product_select', 'shade_select', 'selection_reset', 'result_type', 'result_brand', 'search_submit', 'search_reset', 'filters_reset', 'guide_open', 'guide_close', 'load_more', 'retry', 'picker_open', 'picker_close', 'picker_search'] as const;
export type ShadeAction = (typeof actions)[number];
export interface ShadeContext {
  brandId?: string;
  productId?: string;
  shadeId?: string;
  brandName?: string;
  productName?: string;
  shadeName?: string;
  hex?: string;
  productType?: ProductFilter;
  field?: 'brand' | 'product' | 'shade' | 'resultBrand';
  searchLength?: number;
  hasSearch?: boolean;
  optionCount?: number;
  shownCount?: number;
}
type Parameters = Record<string, string | number | boolean>;

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function emit(event: AnalyticsEvent, parameters: Parameters) {
  try {
    // Keep the payload bounded alongside the shared page and environment fields.
    trackEvent(event, Object.fromEntries(Object.entries(parameters).slice(0, 10)));
  } catch {
    // Analytics delivery must never interrupt the tool.
  }
}

function context(input: ShadeContext): Parameters {
  const result: Parameters = {};
  for (const key of ['brandId', 'productId', 'shadeId'] as const) {
    if (isShadeId(input[key])) { result[key] = input[key]; }
  }
  for (const key of ['brandName', 'productName', 'shadeName'] as const) {
    if (typeof input[key] === 'string') { result[key] = input[key].slice(0, 100); }
  }
  if (typeof input.hex === 'string' && /^#[0-9a-f]{6}$/i.test(input.hex)) { result.hex = input.hex.toLowerCase(); }
  if (input.productType && ['all', 'foundation', 'cushion'].includes(input.productType)) { result.productType = input.productType; }
  if (input.field && ['brand', 'product', 'shade', 'resultBrand'].includes(input.field)) { result.field = input.field; }
  for (const key of ['searchLength', 'optionCount', 'shownCount'] as const) {
    if (count(input[key])) { result[key] = input[key]; }
  }
  if (typeof input.hasSearch === 'boolean') { result.hasSearch = input.hasSearch; }
  return result;
}

export function trackShadeAction(action: ShadeAction, details: ShadeContext = {}) {
  if (actions.includes(action)) { emit(ANALYTICS_EVENTS.SHADE_ACTION, { action, ...context(details) }); }
}

export function shadeRequestContext(url: string): Parameters {
  const result: Parameters = {};
  const params = new URLSearchParams(url.split('?')[1] ?? '');
  for (const key of ['shadeId', 'brandId', 'productId']) {
    const value = params.get(key);
    if (isShadeId(value)) { result[key] = value; }
  }
  const productType = params.get('type');
  if (productType === 'foundation' || productType === 'cushion') { result.productType = productType; }
  const offset = params.get('offset');
  if (offset !== null && count(Number(offset))) { result.offset = Number(offset); }
  const query = params.get('q') ?? '';
  result.searchLength = Math.min(100, Array.from(query).length);
  result.hasSearch = query.length > 0;
  return result;
}

export function trackShadeRequest(resource: string, url: string, result: 'ok' | 'error', status: number, durationMs: number, failure?: 'network' | 'http' | 'timeout' | 'validation') {
  if (!['bootstrap', 'products', 'shades', 'matches'].includes(resource)) { return; }
  const { offset, searchLength, hasSearch, shadeId, productId, brandId } = shadeRequestContext(url);
  emit(ANALYTICS_EVENTS.SHADE_REQUEST, {
    resource, result, status, durationMs: Math.max(0, Math.round(durationMs)),
    ...(failure ? { failure } : {}),
    ...(typeof offset === 'number' ? { offset } : {}),
    searchLength, hasSearch,
    ...(shadeId ? { shadeId } : productId ? { productId } : brandId ? { brandId } : {}),
  });
}

export function trackShadeResults(url: string, total: number, shown: number) {
  if (count(total) && count(shown)) {
    emit(ANALYTICS_EVENTS.SHADE_RESULTS, { totalCount: total, shownCount: shown, hasResults: total > 0, ...shadeRequestContext(url) });
  }
}

export function trackShadeImpression(selectedShadeId: string, match: MatchView, position: number) {
  if (!isShadeId(selectedShadeId) || !isShadeId(match.product.id) || !isShadeId(match.shade.id) || !count(position) || !Number.isFinite(match.deltaE)) { return; }
  emit(ANALYTICS_EVENTS.SHADE_IMPRESSION, {
    selectedShadeId, productId: match.product.id, shadeId: match.shade.id,
    brandName: match.brandName, productName: match.product.name, shadeName: match.shade.name,
    hex: match.shade.hex, productType: match.product.type, deltaE: match.deltaE, position,
  });
}

export function trackShadeExit(stage: 'view' | 'brand' | 'product' | 'selected' | 'results', durationMs: number) {
  if (['view', 'brand', 'product', 'selected', 'results'].includes(stage) && Number.isFinite(durationMs)) {
    emit(ANALYTICS_EVENTS.SHADE_EXIT, { stage, durationMs: Math.max(0, Math.round(durationMs)), transport_type: 'beacon' });
  }
}
