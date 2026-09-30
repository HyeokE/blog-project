import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {readFileSync} from 'node:fs';
import {RollingNumber} from '../src/components/craft/RollingNumber.mjs';

test('initial server value is readable once and never starts at zero',()=>{
 const html=renderToStaticMarkup(createElement(RollingNumber,{value:19}));
 assert.match(html,/>19<\/span>/);
 assert.match(html,/aria-hidden="true"/);
 assert.doesNotMatch(html,/aria-live/);
});
test('changing counts keep one accessible value and never animate vertically',()=>{
 const source=readFileSync(new URL('../src/components/craft/RollingNumber.mjs',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/app/craft/design-system.css',import.meta.url),'utf8');
 for(const count of [9,10,15,16,0,1]){
  const html=renderToStaticMarkup(createElement(RollingNumber,{value:count}));
  assert.match(html,new RegExp(`>${count}<\/span>`));
 }
 assert.doesNotMatch(source,/craft-rolling-stack|translateY/);
 assert.doesNotMatch(css,/craft-roll-up|craft-roll-down|translateY/);
});
test('visual digits use a baseline-stable inline box rather than a flex baseline',()=>{
 const css=readFileSync(new URL('../src/app/craft/design-system.css',import.meta.url),'utf8');
 assert.match(css,/\.craft-rolling-visual\{display:inline-block(?:;|\})/);
});
test('place-value digit extraction handles carry, reverse, zero and invalid values',async()=>{
 const {digitPlaces,formatRollingValue}=await import('../src/components/craft/rolling-number.mjs');
 assert.deepEqual(digitPlaces(9,10).map(x=>x.place),[1,0]);
 assert.deepEqual(digitPlaces(10,9).map(x=>x.place),[1,0]);
 assert.deepEqual(digitPlaces(0,0).map(x=>x.digit),[0]);
 assert.equal(formatRollingValue(Infinity),'0');
 assert.equal(formatRollingValue(1200,'en-US'),'1,200');
});
