import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/app/craft/surface-motion.css',import.meta.url),'utf8');
test('portaled and inline surfaces opt into stateful fade without positional motion',()=>{
  for(const surface of ['wwm-create-dialog','wwm-login-dialog','wwm-settings-dialog','wwm-range-popover','wwm-time-panel','wwm-tz-popover','wwm-week-detail','craft-account-menu','wwm-room-calendar']) assert.match(css,new RegExp(`\\.${surface.replaceAll('-','\\-')}`));
  assert.match(css,/data-state=['"]closed['"]/);
  assert.match(css,/data-state=['"]open['"]/);
  assert.match(css,/prefers-reduced-motion:\s*reduce/);
  assert.doesNotMatch(css,/(translateY|translate3d|slide-in|zoom-in|scale\()/);
});
test('pointer excludes disabled controls and text inputs',()=>{
  assert.match(css,/button:not\(:disabled\):not\(\[aria-disabled=['"]true['"]\]\)/);
  assert.match(css,/\[data-slot=['"]dropdown-menu-item['"]\]:not\(\[data-disabled\]\)/);
  assert.match(css,/cursor:\s*pointer/);
  assert.match(css,/cursor:\s*not-allowed/);
  assert.match(css,/cursor:\s*text/);
  assert.match(css,/\[role='menuitem'\]:not\(\[aria-disabled='true'\]\):not\(\[data-disabled\]\)/);
  assert.match(css,/input\[type='checkbox'\]:not\(:disabled\)/);
  assert.match(css,/input\[type='radio'\]:not\(:disabled\)/);
  assert.match(css,/\[role='menuitem'\]\[data-disabled\]/);
});
test('state selectors outrank feature animation:none!important overrides, including reduced motion',()=>{
  const rule=/:is\(\.wwm-create-dialog,[^}]+\)\[data-state='open'\]\s*\{\s*animation:\s*craft-surface-enter 180ms ease-out both !important/;
  assert.match(css,rule);
  assert.match(css,/:is\(\.wwm-create-dialog,[^}]+\)\[data-state='closed'\]\s*\{\s*animation:\s*craft-surface-exit 140ms ease-in both !important/);
  const reduced=css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([\s\S]*)\}\s*$/)?.[1];
  assert.ok(reduced);
  assert.match(reduced,/:is\(\.wwm-create-dialog,[^}]+\)\[data-state\][^{]*\{\s*animation:\s*none !important/);
});
