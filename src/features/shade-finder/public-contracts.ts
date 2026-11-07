import type {
  BrandOption,
  MatchView,
  MatchesResponse,
  ProductOption,
  ProductsResponse,
  ProductType,
  ShadeFinderBootstrap,
  ShadeOption,
  ShadesResponse,
} from './public-types';

function invalid(path: string): never {
  throw new TypeError(`Invalid shade response: ${path}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function record(value: unknown, keys: string[], path: string): Record<string, unknown> {
  if (!isRecord(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) {
    return invalid(path);
  }
  return value;
}

function text(value: unknown, path: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && value.trim().length === 0)) {
    return invalid(path);
  }
  return value;
}

export function isShadeId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value);
}

function identifier(value: unknown, path: string): string {
  if (!isShadeId(value)) {
    return invalid(path);
  }
  return value;
}

function productType(value: unknown, path: string): ProductType {
  if (value !== 'foundation' && value !== 'cushion') {
    return invalid(path);
  }
  return value;
}

function list<T>(value: unknown, parse: (item: unknown, path: string) => T, path: string): T[] {
  if (!Array.isArray(value)) {
    return invalid(path);
  }
  return value.map((item, index) => parse(item, `${path}[${index}]`));
}

function uniqueIds<T extends { id: string }>(items: T[], path: string): T[] {
  if (new Set(items.map(item => item.id)).size !== items.length) {
    return invalid(path);
  }
  return items;
}

function brand(value: unknown, path: string): BrandOption {
  const object = record(value, ['id', 'name', 'nameEn', 'types'], path);
  const types = list(object.types, productType, `${path}.types`);
  if (types.length === 0 || new Set(types).size !== types.length) {
    return invalid(`${path}.types`);
  }
  return {
    id: identifier(object.id, `${path}.id`),
    name: text(object.name, `${path}.name`),
    nameEn: text(object.nameEn, `${path}.nameEn`, true),
    types,
  };
}

function product(value: unknown, path: string): ProductOption {
  const object = record(value, ['id', 'name', 'nameEn', 'type'], path);
  return {
    id: identifier(object.id, `${path}.id`),
    name: text(object.name, `${path}.name`),
    nameEn: text(object.nameEn, `${path}.nameEn`, true),
    type: productType(object.type, `${path}.type`),
  };
}

function shade(value: unknown, path: string): ShadeOption {
  const object = record(value, ['id', 'name', 'hex'], path);
  const hex = text(object.hex, `${path}.hex`);
  if (!/^#[0-9a-f]{6}$/i.test(hex)) {
    return invalid(`${path}.hex`);
  }
  return {
    id: identifier(object.id, `${path}.id`),
    name: text(object.name, `${path}.name`),
    hex: hex.toLowerCase(),
  };
}

function match(value: unknown, path: string): MatchView {
  const object = record(value, ['product', 'brandName', 'shade', 'deltaE'], path);
  if (typeof object.deltaE !== 'number' || !Number.isFinite(object.deltaE) || object.deltaE < 0) {
    return invalid(`${path}.deltaE`);
  }
  return {
    product: product(object.product, `${path}.product`),
    brandName: text(object.brandName, `${path}.brandName`),
    shade: shade(object.shade, `${path}.shade`),
    deltaE: object.deltaE,
  };
}

function nonnegativeInteger(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return invalid(path);
  }
  return value;
}

export function parseShadeFinderBootstrap(value: unknown): ShadeFinderBootstrap {
  const object = record(value, ['brands', 'example'], 'bootstrap');
  const brands = uniqueIds(list(object.brands, brand, 'bootstrap.brands'), 'bootstrap.brands');
  if (object.example === null) {
    return { brands, example: null };
  }
  const example = record(object.example, ['brand', 'product', 'shade'], 'bootstrap.example');
  const exampleBrand = brand(example.brand, 'bootstrap.example.brand');
  const exampleProduct = product(example.product, 'bootstrap.example.product');
  const exampleShade = shade(example.shade, 'bootstrap.example.shade');
  const listedBrand = brands.find(item => item.id === exampleBrand.id);
  if (!listedBrand || listedBrand.name !== exampleBrand.name || listedBrand.nameEn !== exampleBrand.nameEn ||
    listedBrand.types.length !== exampleBrand.types.length || exampleBrand.types.some(type => !listedBrand.types.includes(type)) ||
    !exampleBrand.types.includes(exampleProduct.type)) {
    return invalid('bootstrap.example.brand');
  }
  return { brands, example: { brand: exampleBrand, product: exampleProduct, shade: exampleShade } };
}

export function parseProductsResponse(value: unknown): ProductsResponse {
  const object = record(value, ['products'], 'products');
  return { products: uniqueIds(list(object.products, product, 'products.products'), 'products.products') };
}

export function parseShadesResponse(value: unknown): ShadesResponse {
  const object = record(value, ['shades'], 'shades');
  return { shades: uniqueIds(list(object.shades, shade, 'shades.shades'), 'shades.shades') };
}

export function parseMatchesResponse(value: unknown): MatchesResponse {
  const object = record(value, ['matches', 'total', 'nextOffset'], 'matches');
  const matches = list(object.matches, match, 'matches.matches');
  const total = nonnegativeInteger(object.total, 'matches.total');
  const nextOffset = object.nextOffset === null ? null : nonnegativeInteger(object.nextOffset, 'matches.nextOffset');
  if (matches.length > 6 || matches.length > total || new Set(matches.map(item => item.product.id)).size !== matches.length) {
    return invalid('matches.matches');
  }
  if (nextOffset !== null && (matches.length !== 6 || nextOffset === 0 || nextOffset % 6 !== 0 || nextOffset >= total)) {
    return invalid('matches.nextOffset');
  }
  return { matches, total, nextOffset };
}
