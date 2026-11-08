const ownedKeys = ['selectionType', 'brandId', 'productId', 'shadeId', 'type', 'brand', 'q'];
const privateKeys = ['hex', 'photoHex', 'photo', 'image', 'pixels', 'file', 'whiteReference'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const filter = value => value === 'foundation' || value === 'cushion' ? value : 'all';
const id = value => typeof value === 'string' && uuid.test(value) ? value : '';
const resultsDefault = { type: 'all', brand: '', q: '' };
const sourceDefault = { selectionType: 'all', brandId: '', productId: '', shadeId: '' };

export function readShadeUrlState(search) {
  const params = new URLSearchParams(search);
  const single = key => params.getAll(key).length === 1 ? params.get(key) : null;
  const brandId = id(single('brandId'));
  const productId = brandId ? id(single('productId')) : '';
  const rawQuery = single('q') ?? '';
  const q = Array.from(rawQuery).length <= 100 && !/[\u0000-\u001f\u007f]/u.test(rawQuery)
    ? rawQuery.trim().replace(/\s+/gu, ' ') : '';
  return { selectionType: filter(single('selectionType')), brandId, productId,
    shadeId: productId ? id(single('shadeId')) : '', type: filter(single('type')), brand: id(single('brand')), q };
}

export function writeShadeUrlState(search, state) {
  const params = new URLSearchParams(search);
  for (const key of [...ownedKeys, ...privateKeys]) params.delete(key);
  const validated = readShadeUrlState(new URLSearchParams(Object.fromEntries(ownedKeys.map(key => [key, state[key]]))).toString());
  for (const key of ownedKeys) {
    const value = validated[key];
    if (value !== '' && value !== 'all') params.set(key, value);
  }
  return params.toString();
}

export function updateShadeUrlState(state, action) {
  switch (action.kind) {
    case 'selectionType': return { ...state, ...sourceDefault, ...resultsDefault, selectionType: action.value };
    case 'brandId': return { ...state, ...resultsDefault, brandId: action.value, productId: '', shadeId: '' };
    case 'productId': return { ...state, ...resultsDefault, productId: action.value, shadeId: '' };
    case 'shadeId': return { ...state, shadeId: action.value };
    case 'example': return { ...state, ...sourceDefault, ...resultsDefault, brandId: action.brandId, productId: action.productId, shadeId: action.shadeId };
    case 'sourceReset': return { ...sourceDefault, ...resultsDefault };
    case 'resultsReset': return { ...state, ...resultsDefault };
    case 'type': return { ...state, type: action.value };
    case 'brand': return { ...state, brand: action.value };
    case 'q': return { ...state, q: action.value };
    default: throw new TypeError('Unknown shade URL action');
  }
}
