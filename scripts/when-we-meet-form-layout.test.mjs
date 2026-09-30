import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const css=read('../src/features/when-we-meet/when-we-meet.css');
const range=read('../src/features/when-we-meet/DateRangePicker.tsx');
const shared=read('../src/app/craft/design-system.css');
test('creation date field is the shared FieldTrigger with a trailing calendar icon',()=>{
 assert.match(range,/<FieldTrigger id=\{`\$\{id\}-trigger`\}[^>]*icon=\{<CalendarDays aria-hidden="true"\/>\}/);
 assert.match(range,/formatCraftRange\(start,end\)/,'ranges display as yyyy.mm.dd – yyyy.mm.dd');
});
test('required marker is a 4px decorative circle at label cap height',()=>{
 assert.match(shared,/\.craft-required-dot\{[^}]*top:3px;right:-6px;width:4px;height:4px;border-radius:50%/);
});
test('mobile footer gives form body space without shrinking actions',()=>{
 assert.match(css,/@media\(max-width:600px\)\{[^\n]*\.wwm-create-footer\{[^}]*display:grid;grid-template-columns:/);
 assert.match(css,/\.wwm-create-footer \[data-slot='button'\]\{width:100%\}/);
 assert.match(shared,/\[data-slot='button'\][^{]*\{[^}]*height:var\(--craft-h-md\);min-height:var\(--craft-h-md\)/);
 assert.match(shared,/--craft-h-md:44px/);
});
