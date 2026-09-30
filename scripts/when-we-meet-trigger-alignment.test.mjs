import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/features/when-we-meet/date-range-picker.css', import.meta.url), 'utf8');

test('portaled creation date trigger explicitly centers icon and value', () => {
  assert.match(css, /\.wwm-create-body \.wwm-range \.wwm-picker-trigger\{[^}]*[^}]*display:flex;align-items:center;/);
  assert.match(css, /\.wwm-create-body \.wwm-range \.wwm-picker-trigger svg\{[^}]*width:18px;height:18px/);
  assert.match(css, /\.wwm-create-body \.wwm-range #wwm-range-value\{[^}]*text-overflow:ellipsis;white-space:nowrap/);
});
