import 'server-only';

import { CatalogReadError, createShadeRepository } from './data-access';
import { isShadeId } from './public-contracts';
import type { ProductFilter } from './public-types';

class RequestError extends Error {
  constructor(public readonly status: 400, message: string) { super(message); }
}

function requestParams(request: Request, allowed: string[]) {
  const params = new URL(request.url).searchParams;
  for (const key of params.keys()) {
    if (!allowed.includes(key) || params.getAll(key).length !== 1) {
      throw new RequestError(400, 'Invalid query parameters.');
    }
  }
  return params;
}

function requiredId(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!isShadeId(value)) {
    throw new RequestError(400, `Invalid ${key}.`);
  }
  return value;
}

function requiredHex(params: URLSearchParams) {
  const value = params.get('hex');
  if (value === null || !/^#[0-9a-f]{6}$/i.test(value)) {
    throw new RequestError(400, 'Invalid hex.');
  }
  return value.toLowerCase();
}

function productFilter(params: URLSearchParams): ProductFilter {
  const value = params.get('type') ?? 'all';
  if (value !== 'all' && value !== 'foundation' && value !== 'cushion') {
    throw new RequestError(400, 'Invalid product type.');
  }
  return value;
}

function matchQuery(params: URLSearchParams) {
  const value = params.get('q') ?? '';
  if (Array.from(value).length > 100 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new RequestError(400, 'Invalid search query.');
  }
  return value.trim().replace(/\s+/gu, ' ');
}

function matchOffset(params: URLSearchParams) {
  const value = params.get('offset') ?? '0';
  if (!/^(0|[1-9]\d*)$/.test(value)) { throw new RequestError(400, 'Invalid offset.'); }
  const offset = Number(value);
  if (!Number.isSafeInteger(offset) || offset > 100000 || offset % 6 !== 0) {
    throw new RequestError(400, 'Invalid offset.');
  }
  return offset;
}

async function respond<T>(read: () => Promise<T>) {
  const headers = { 'Cache-Control': 'private, no-store' };
  try {
    return Response.json(await read(), { headers });
  } catch (error) {
    const status = error instanceof RequestError || error instanceof CatalogReadError ? error.status : 503;
    const message = error instanceof RequestError ? error.message : 'Unable to load shade data.';
    return Response.json({ error: message }, { status, headers });
  }
}

export function handleBootstrapRequest(request: Request) {
  return respond(async () => {
    requestParams(request, []);
    return (await createShadeRepository()).readBootstrap();
  });
}

export function handleProductsRequest(request: Request) {
  return respond(async () => {
    const params = requestParams(request, ['brandId', 'type']);
    const brandId = requiredId(params, 'brandId');
    const type = productFilter(params);
    return (await createShadeRepository()).readProducts(brandId, type);
  });
}

export function handleShadesRequest(request: Request) {
  return respond(async () => {
    const params = requestParams(request, ['productId']);
    const productId = requiredId(params, 'productId');
    return (await createShadeRepository()).readShades(productId);
  });
}

export function handleMatchesRequest(request: Request) {
  return respond(async () => {
    const params = requestParams(request, ['shadeId', 'hex', 'type', 'brandId', 'offset', 'q']);
    if (params.has('shadeId') === params.has('hex')) {
      throw new RequestError(400, 'Provide exactly one shadeId or hex.');
    }
    const source = params.has('shadeId')
      ? { kind: 'shade' as const, value: requiredId(params, 'shadeId') }
      : { kind: 'hex' as const, value: requiredHex(params) };
    const type = productFilter(params);
    const brandId = params.has('brandId') ? requiredId(params, 'brandId') : undefined;
    const offset = matchOffset(params);
    const query = matchQuery(params);
    const repository = await createShadeRepository();
    return source.kind === 'shade'
      ? repository.readMatches(source.value, type, brandId, offset, query)
      : repository.readHexMatches(source.value, type, brandId, offset, query);
  });
}
