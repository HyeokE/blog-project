import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const feature=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
const account=readFileSync(new URL('../src/app/craft/CraftAccount.tsx',import.meta.url),'utf8');
test('Craft uses shadcn controls in live form and room actions',()=>{
 assert.match(feature,/<Button[^>]*onClick=\{save\}/);
 assert.match(feature,/<Input[^>]*value=\{form\.title\}/);
 assert.match(feature,/<Tabs[^>]*value=\{view\}/);
});
test('shared profile uses Radix dropdown and real button',()=>{
 assert.match(account,/<DropdownMenu/);
 assert.match(account,/<DropdownMenuItem/);
 assert.match(account,/<Button/);
});
test('shared count rolls in room status and recommendations, not calendar date',()=>{
 assert.match(feature,/<RollingNumber value=\{mine\.length\}/);
 assert.match(feature,/<RollingNumber value=\{responses\.length\}/);
});
