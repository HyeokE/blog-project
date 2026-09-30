import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=read('../src/features/when-we-meet/when-we-meet.css');
const range=read('../src/features/when-we-meet/date-range-picker.css');
const shared=read('../src/app/craft/design-system.css');
test('creation date value follows its icon instead of space-between',()=>{
 assert.match(range,/\.wwm-create-body \.wwm-range \.wwm-picker-trigger\{justify-content:flex-start;gap:9px/);
 assert.match(range,/\.wwm-create-body \.wwm-range \.wwm-picker-trigger svg\{flex:none/);
});
test('required marker is a 4px decorative circle at label cap height',()=>{
 assert.match(shared,/\.craft-required-dot\{[^}]*top:3px;right:-6px;width:4px;height:4px;border-radius:50%/);
});
test('mobile footer gives form body space without shrinking actions',()=>{
 assert.match(css,/@media\(max-width:600px\)\{[^\n]*\.wwm-create-footer\{[^}]*display:grid;grid-template-columns:/);
 assert.match(css,/\.wwm-create-footer \.wwm-reset\{[^}]*grid-column:/);
 assert.match(css,/\.wwm-create-footer button\{min-height:44px/);
});
