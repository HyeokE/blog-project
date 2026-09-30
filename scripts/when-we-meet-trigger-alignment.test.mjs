import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/app/craft/design-system.css', import.meta.url), 'utf8');
const trigger = readFileSync(new URL('../src/components/ui/field-trigger.tsx', import.meta.url), 'utf8');

test('picker triggers share one field: centred value, right-aligned 16px icon, ellipsis', () => {
  assert.match(trigger, /data-slot="field-trigger"/);
  assert.match(trigger, /<span data-slot="field-trigger-value"[^>]*>\{empty \? placeholder : value\}<\/span>\s*\{icon \?\? <ChevronDownIcon/);
  assert.match(css, /\[data-slot='field-trigger'\],\[data-slot='select-trigger'\]\)\{display:flex;align-items:center;justify-content:space-between/);
  assert.match(css, /\[data-slot='select-trigger'\]\)>svg\{flex:none;width:16px;height:16px/);
  assert.match(css, /\[data-slot='select-value'\]\)\{[^}]*text-overflow:ellipsis;white-space:nowrap/);
});
