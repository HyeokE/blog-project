'use client';

import { trackShadeRequest } from './analytics';
import { parseMatchesResponse, parseProductsResponse, parseShadeFinderBootstrap, parseShadesResponse } from './public-contracts';
import type { MatchesResponse, ProductsResponse, ShadeFinderBootstrap, ShadesResponse } from './public-types';

type Resource = 'bootstrap' | 'products' | 'shades' | 'matches';

// Stable promises let React use() suspend only the region awaiting real data.
const queries = {
  bootstrap: new Map<string, Promise<ShadeFinderBootstrap>>(),
  products: new Map<string, Promise<ProductsResponse>>(),
  shades: new Map<string, Promise<ShadesResponse>>(),
  matches: new Map<string, Promise<MatchesResponse>>(),
};

function request<T>(resource: Resource, url: string, parse: (value: unknown) => T, cache: Map<string, Promise<T>>): Promise<T> {
  if (url.split('?')[0] !== `/api/craft/shade-finder/${resource}`) {
    throw new TypeError('Invalid shade endpoint.');
  }
  const cached = cache.get(url);
  if (cached) {return cached;}
  const started = Date.now();
  let status = 0;
  let failure: 'network' | 'http' | 'timeout' | 'validation' = 'network';
  const promise = Promise.resolve().then(async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    status = response.status;
    if (!response.ok) {
      failure = 'http';
      throw new Error('색상 정보를 불러오지 못했어요.');
    }
    failure = 'validation';
    const payload: unknown = await response.json();
    const result = parse(payload);
    trackShadeRequest(resource, url, 'ok', status, Date.now() - started);
    return result;
  }).catch((error: unknown) => {
    const category = error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : failure;
    trackShadeRequest(resource, url, 'error', status, Date.now() - started, category);
    throw error;
  });
  cache.set(url, promise);
  // React will surface the rejection through the region's ErrorBoundary.
  void promise.catch(() => undefined);
  return promise;
}

export function requestShadeData(resource: 'bootstrap', url: string): Promise<ShadeFinderBootstrap>;
export function requestShadeData(resource: 'products', url: string): Promise<ProductsResponse>;
export function requestShadeData(resource: 'shades', url: string): Promise<ShadesResponse>;
export function requestShadeData(resource: 'matches', url: string): Promise<MatchesResponse>;
export function requestShadeData(resource: Resource, url: string): Promise<ShadeFinderBootstrap | ProductsResponse | ShadesResponse | MatchesResponse> {
  switch (resource) {
    case 'bootstrap': return request(resource, url, parseShadeFinderBootstrap, queries.bootstrap);
    case 'products': return request(resource, url, parseProductsResponse, queries.products);
    case 'shades': return request(resource, url, parseShadesResponse, queries.shades);
    case 'matches': return request(resource, url, parseMatchesResponse, queries.matches);
  }
}

export function retryShadeData(url: string) {
  for (const cache of Object.values(queries)) {cache.delete(url);}
}

export function shadeApiUrl(resource: Resource, params: Record<string, string | number>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {if (value !== '') {search.set(key, String(value));}}
  return `/api/craft/shade-finder/${resource}?${search}`;
}
