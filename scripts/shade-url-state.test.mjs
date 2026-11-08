import assert from 'node:assert/strict';
import test from 'node:test';
import { readShadeUrlState, writeShadeUrlState, updateShadeUrlState } from '../src/features/shade-finder/url-state.mjs';

const uuid = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const empty = { selectionType: 'all', brandId: '', productId: '', shadeId: '', type: 'all', brand: '', q: '' };
const full = { selectionType: 'foundation', brandId: uuid(1), productId: uuid(2), shadeId: uuid(3), type: 'cushion', brand: uuid(4), q: '브랜드 21' };

test('valid source and recommendation filters round-trip without default parameters', () => {
  assert.deepEqual(readShadeUrlState(''), empty);
  assert.equal(writeShadeUrlState('', empty), '');
  assert.deepEqual(readShadeUrlState(writeShadeUrlState('', full)), full);
  assert.equal(writeShadeUrlState('selectionType=all&type=all&q=', empty), '');
  const query = writeShadeUrlState('', { ...empty, q: '  브랜드   21  ' });
  assert.equal(new URLSearchParams(query).get('q'), '브랜드 21');
});

test('malformed, duplicate and orphan source IDs never become API parameters', () => {
  for (const id of ['bad', '', 'B1:P1', '00000000-0000-0000-0000-000000000000', uuid(10).toUpperCase()]) {
    const result = readShadeUrlState(new URLSearchParams({ brandId: id, productId: uuid(2), shadeId: uuid(3) }).toString());
    assert.equal(result.brandId, ''); assert.equal(result.productId, ''); assert.equal(result.shadeId, '');
  }
  assert.deepEqual(readShadeUrlState(`brandId=${uuid(1)}&brandId=${uuid(1)}&productId=${uuid(2)}`), empty);
  assert.deepEqual(readShadeUrlState(`productId=${uuid(2)}&shadeId=${uuid(3)}`), empty);
  assert.deepEqual(readShadeUrlState(`brandId=${uuid(1)}&productId=invalid&shadeId=${uuid(3)}`), { ...empty, brandId: uuid(1) });
  assert.deepEqual(readShadeUrlState('type=unknown&selectionType=bad&brand=invalid'), empty);
  assert.equal(readShadeUrlState('type=foundation&type=cushion').type, 'all');
});

test('submitted search keeps Unicode within bounds, normalizes spaces and rejects controls or duplicates', () => {
  for (const q of ['가'.repeat(100), '😀'.repeat(100), '100%_literal', '한글 English']) {
    assert.equal(readShadeUrlState(new URLSearchParams({ q }).toString()).q, q);
  }
  for (const q of ['가'.repeat(101), '😀'.repeat(101), ' '.repeat(101), 'a\nb', 'a\tb', '\u0000', '\u007f']) {
    assert.equal(readShadeUrlState(new URLSearchParams({ q }).toString()).q, '');
  }
  assert.equal(readShadeUrlState('q=one&q=two').q, '');
  assert.equal(readShadeUrlState('q=++%EB%B8%8C%EB%9E%9C%EB%93%9C+++21++').q, '브랜드 21');
});

test('source actions clear dependent IDs and filters atomically, while shade and result filters stay independent', () => {
  assert.deepEqual(updateShadeUrlState(full, { kind: 'selectionType', value: 'cushion' }), { ...empty, selectionType: 'cushion' });
  assert.deepEqual(updateShadeUrlState(full, { kind: 'brandId', value: uuid(5) }), { ...empty, selectionType: 'foundation', brandId: uuid(5) });
  assert.deepEqual(updateShadeUrlState(full, { kind: 'productId', value: uuid(6) }), { ...empty, selectionType: 'foundation', brandId: uuid(1), productId: uuid(6) });
  assert.deepEqual(updateShadeUrlState(full, { kind: 'shadeId', value: uuid(7) }), { ...full, shadeId: uuid(7) });
  assert.deepEqual(updateShadeUrlState(full, { kind: 'example', brandId: uuid(5), productId: uuid(6), shadeId: uuid(7) }), { ...empty, brandId: uuid(5), productId: uuid(6), shadeId: uuid(7) });
  assert.deepEqual(updateShadeUrlState(full, { kind: 'sourceReset' }), empty);
  assert.deepEqual(updateShadeUrlState(full, { kind: 'resultsReset' }), { ...full, type: 'all', brand: '', q: '' });
  for (const [kind, value] of [['type', 'all'], ['brand', uuid(8)], ['q', '새 검색']]) {
    assert.deepEqual(updateShadeUrlState(full, { kind, value }), { ...full, [kind]: value });
  }
  assert.equal(full.shadeId, uuid(3), 'Updates must not mutate prior history state');
});

test('canonical URLs preserve unrelated campaign queries and remove image fields and invalid owned values', () => {
  const original = `utm_source=share&utm_tag=a&utm_tag=b&hex=%23e5bda0&photoHex=%23e5bda0&photo=data&image=blob&pixels=1&file=face.jpg&whiteReference=secret&type=bad&brandId=bad`;
  const next = writeShadeUrlState(original, readShadeUrlState(original));
  assert.equal(next, 'utm_source=share&utm_tag=a&utm_tag=b');
  const canonical = writeShadeUrlState(original, full);
  assert.equal(writeShadeUrlState(canonical, readShadeUrlState(canonical)), canonical);
  for (const key of ['hex', 'photoHex', 'photo', 'image', 'pixels', 'file', 'whiteReference']) assert.equal(new URLSearchParams(canonical).has(key), false);
});

test('back and forward snapshots restore exact committed filters without retaining later edits', () => {
  const first = writeShadeUrlState('utm_source=share', full);
  const second = writeShadeUrlState(first, updateShadeUrlState(readShadeUrlState(first), { kind: 'type', value: 'foundation' }));
  const third = writeShadeUrlState(second, updateShadeUrlState(readShadeUrlState(second), { kind: 'q', value: 'new query' }));
  assert.deepEqual(readShadeUrlState(first), full);
  assert.deepEqual(readShadeUrlState(second), { ...full, type: 'foundation' });
  assert.deepEqual(readShadeUrlState(third), { ...full, type: 'foundation', q: 'new query' });
});


test('pasted percent-encoded spaces canonicalize like plus-encoded queries and remove private fields', () => {
  const raw = 'q=two%20words&hex=%23c49c80&type=all';
  const normalized = new URLSearchParams(raw).toString();
  assert.equal(normalized, 'q=two+words&hex=%23c49c80&type=all');
  assert.deepEqual(readShadeUrlState(raw), readShadeUrlState(normalized));
  assert.equal(writeShadeUrlState(normalized, readShadeUrlState(normalized)), 'q=two+words');
});
