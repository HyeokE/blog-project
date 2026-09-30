import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/features/when-we-meet/time-picker.css', import.meta.url), 'utf8');

test('time popup width respects its trigger and Radix collision width, not only the viewport', () => {
  assert.match(css, /width:min\(290px,var\(--radix-popper-anchor-width\),var\(--radix-popper-available-width\)\)/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /min-height:44px/);
});

test('time popup scroll viewport is capped by Radix actual collision height after panel chrome', () => {
  assert.match(css, /--radix-popper-available-height/);
  assert.match(css, /\.wwm-time-scroll\{[^}]*height:min\(228px,calc\(var\(--radix-popper-available-height[^)]*\) - 18px\)\)/);
});
