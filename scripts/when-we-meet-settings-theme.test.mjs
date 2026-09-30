import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css = readFileSync(new URL('../src/features/when-we-meet/room-toolbar.css', import.meta.url), 'utf8');
const settings = css.slice(css.indexOf('.wwm-settings-dialog'));

test('portaled settings dialog owns both Craft theme token sets', () => {
  for (const token of ['canvas', 'ink', 'muted', 'surface', 'rule', 'focus']) {
    assert.match(settings, new RegExp(`\\.wwm-settings-dialog\\s*\\{[^}]*--craft-${token}:`));
    assert.match(settings, new RegExp(`:root\\[data-mode=['"]dark['"]\\]\\s+\\.wwm-settings-dialog\\s*\\{[^}]*--craft-${token}:`));
  }
});

test('settings controls have themed focus, outline and disabled styles', () => {
  assert.match(settings, /\.wwm-settings-dialog\s+\[data-slot=['"]button['"]\]:focus-visible/);
  assert.match(settings, /\.wwm-settings-dialog\s+\[data-slot=['"]input['"]\]:focus-visible/);
  assert.match(settings, /\.wwm-settings-dialog\s+\[data-variant=['"]outline['"]\]/);
  assert.match(settings, /\.wwm-settings-dialog\s+\[data-slot=['"]button['"]\]:disabled/);
});
