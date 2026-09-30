import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const toolbar = readFileSync(new URL('../src/features/when-we-meet/room-toolbar.css', import.meta.url), 'utf8');
const tokens = readFileSync(new URL('../src/app/craft/design-system.css', import.meta.url), 'utf8');
const block = selector => tokens.slice(tokens.indexOf(`${selector}{`)).split('}')[0];

test('portaled dialogs inherit both Craft token sets from :root[data-craft] instead of per-dialog copies', () => {
  for (const token of ['canvas', 'ink', 'muted', 'surface', 'rule', 'focus', 'danger']) {
    assert.match(block(':root[data-craft]'), new RegExp(`--craft-${token}:`));
    assert.match(block(":root[data-craft][data-mode='dark']"), new RegExp(`--craft-${token}:`));
  }
  assert.doesNotMatch(toolbar, /\.wwm-settings-dialog\{[^}]*--craft-/, 'settings must not redeclare tokens');
  assert.doesNotMatch(toolbar, /:root\[data-mode=['"]dark['"]\]\s+\.wwm-settings-dialog/);
});

test('settings controls get focus, outline variant and disabled styles from the shared primitives', () => {
  assert.match(tokens, /\[data-slot='input'\],\[data-slot='field-trigger'\],\[data-slot='select-trigger'\],\[data-slot='button'\]:not\(:where\([^)]*\)\),\[data-slot='checkbox'\]\):focus-visible\{outline:2px solid var\(--craft-focus\);outline-offset:2px/);
  assert.match(tokens, /\[data-slot='button'\][^{]*\[data-variant='outline'\]\{/);
  assert.match(tokens, /\[data-slot='button'\][^{]*:disabled\{opacity:\.5/);
  assert.match(tokens, /\[data-slot='select-trigger'\]\):disabled\{opacity:\.5/);
  assert.doesNotMatch(toolbar, /\.wwm-settings-dialog (input|\[data-slot=['"](button|input)['"]\])/, 'no per-dialog control overrides');
});
