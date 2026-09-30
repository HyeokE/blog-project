import test from 'node:test';
import assert from 'node:assert/strict';
import { safeReturnPath } from '../src/features/when-we-meet/return-path.mjs';
test('accepts only local scheduling paths, preserving invite query',()=>{
 assert.equal(safeReturnPath('/craft/when-we-meet/00000000-0000-4000-8000-000000000000?invite=abc'),'/craft/when-we-meet/00000000-0000-4000-8000-000000000000?invite=abc');
 assert.equal(safeReturnPath('/craft/when-we-meet'),'/craft/when-we-meet');
 assert.equal(safeReturnPath('//evil.example/x'),'/craft/when-we-meet');
 assert.equal(safeReturnPath('/craft/when-we-meet/../admin'),'/craft/when-we-meet');
 assert.equal(safeReturnPath('https://evil.example'),'/craft/when-we-meet');
});
