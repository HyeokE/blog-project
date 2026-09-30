import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const label=read('../src/components/craft/RequiredFieldLabel.tsx');
const css=read('../src/app/craft/design-system.css');
const form=read('../src/features/when-we-meet/WhenWeMeet.tsx');
const range=read('../src/features/when-we-meet/DateRangePicker.tsx');
const time=read('../src/features/when-we-meet/DateTimePicker.tsx');
test('shared label composes shadcn Label and decorates only required fields',()=>{
 assert.match(label,/import\s*\{Label\}\s*from\s*['"]@\/components\/ui\/label['"]/);
 assert.match(label,/required\s*&&\s*<span[^>]*aria-hidden="true"/);
 assert.match(label,/htmlFor=\{htmlFor\}/);
 assert.match(css,/\.craft-required-dot\{[^}]*width:4px;[^}]*height:4px;[^}]*border-radius:50%/);
 assert.match(css,/--craft-required:/);
});
test('create and join fields use shared label while retaining input required',()=>{
 for(const id of ['wwm-create-title-input','wwm-create-timezone','wwm-create-name','wwm-join-name','wwm-join-token','wwm-room-name']) assert.match(form,new RegExp(`htmlFor="${id}"`));
 assert.match(form,/<Input id="wwm-create-title-input" required/);
 assert.match(form,/<Input id="wwm-join-token" required/);
});
test('custom range and time triggers expose required semantics',()=>{
 assert.match(range,/aria-required="true"/);
 assert.match(time,/aria-required="true"/);
 assert.match(range,/RequiredFieldLabel/);
 assert.match(time,/RequiredFieldLabel/);
});
