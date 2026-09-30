import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../src/features/when-we-meet/',import.meta.url);
test('own blocks identify one-slot and two-slot density',()=>{const source=readFileSync(new URL('WeeklyAvailability.tsx',root),'utf8');assert.ok(source.includes('data-density={block.slotIds.length===1'));assert.ok(source.includes("block.slotIds.length===2?'double'"));});
test('compact own blocks center content with explicit line height',()=>{const css=readFileSync(new URL('week-calendar.css',root),'utf8');assert.ok(/\.wwm-calendar-own-event\[data-density='single'\][^{]*\{[^}]*justify-content:center/.test(css));assert.ok(/\.wwm-calendar-own-event small\{[^}]*line-height:16px/.test(css));});
