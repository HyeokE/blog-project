import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/features/when-we-meet/time-picker.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('../src/app/craft/design-system.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('../src/features/when-we-meet/DateTimePicker.tsx', import.meta.url), 'utf8');

test('time list is the shared Select, exactly as wide as its trigger', () => {
  assert.match(source, /<Select value=\{selected\} onValueChange=\{onChange\} required>/);
  assert.match(source, /<SelectContent className="wwm-time-panel"/);
  assert.match(css, /\[data-slot='select-content'\]\.wwm-time-panel\{width:var\(--radix-select-trigger-width\)\}/);
  assert.match(tokens, /\[data-slot='select-item'\],\[data-slot='command-item'\]\)\{[^}]*min-height:var\(--craft-h-md\)/);
});

test('time list height is capped by the collision-aware available height', () => {
  assert.match(tokens, /\[data-slot='select-content'\]\{[^}]*max-height:min\(320px,var\(--radix-select-content-available-height\)\)/);
});
