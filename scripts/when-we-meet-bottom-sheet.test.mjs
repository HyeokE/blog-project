import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const dialog=read('src/components/ui/dialog.tsx');
const css=read('src/components/ui/dialog-sheet.css');
const mobile=css.slice(css.indexOf('@media (max-width: 640px) {'),css.indexOf('@media (max-width: 640px) and (prefers-reduced-motion'));
const reduced=css.slice(css.indexOf('@media (max-width: 640px) and (prefers-reduced-motion: reduce)'));

test('shared DialogContent opts every dialog into the mobile sheet with a decorative handle',()=>{
 assert.match(dialog,/import "\.\/dialog-sheet\.css"/);
 assert.match(dialog,/mobilePresentation = "sheet"/);
 assert.match(dialog,/data-mobile-presentation=\{mobilePresentation\}/);
 assert.match(dialog,/<div data-slot="dialog-sheet-handle" aria-hidden="true" \/>/);
 // Radix keeps focus trap, Escape and overlay dismissal; drag starts only from the grab bar or header,
 // never from interactive controls, and dismissal goes through Radix Close so onOpenChange guards apply.
 assert.match(dialog,/closest\("\[data-slot='dialog-sheet-handle'\],\[data-slot='dialog-header'\]"\)/);
 assert.match(dialog,/closest\(INTERACTIVE\)/);
 assert.match(dialog,/closeRef\.current\?\.click\(\)/);
 assert.doesNotMatch(dialog,/onTouchMove|touchstart/);
 assert.match(dialog,/<DialogOverlay \/>/);
});

test('desktop keeps the centered modal; handle is hidden outside the mobile query',()=>{
 assert.match(dialog,/top-\[50%\] left-\[50%\][^"]*translate-x-\[-50%\] translate-y-\[-50%\]/);
 assert.match(css.slice(0,css.indexOf('@media')),/\[data-slot='dialog-sheet-handle'\] \{ display: none; \}/);
});

test('mobile sheet is bottom-anchored, full width, bounded top corners and safe-area aware',()=>{
 const sheet=mobile.slice(0,mobile.indexOf('}'));
 for(const rule of [/top: auto !important/,/bottom: 0 !important/,/left: 0 !important/,/right: 0 !important/,/width: 100% !important/,/max-width: none !important/,/translate: none !important/,/border-radius: 4px 4px 0 0 !important/,/env\(safe-area-inset-bottom, 0px\)/,/overscroll-behavior: contain/]){
  assert.match(sheet,rule);
 }
 // dvh with a vh fallback, declared in that order.
 assert.ok(sheet.indexOf('max-height: 90vh')>-1&&sheet.indexOf('max-height: 90vh')<sheet.indexOf('max-height: 90dvh'));
 // transform must stay non-important so the slide keyframes can animate it.
 assert.doesNotMatch(sheet,/transform: none !important/);
});

test('long bodies scroll inside the sheet while header and footer stay put',()=>{
 assert.match(mobile,/> \* \{ flex-shrink: 0; \}/);
 assert.match(mobile,/> :is\(form, \[class\*='-body'\]\) \{[^}]*min-height: 0;[^}]*overflow-y: auto;/);
 assert.match(mobile,/> form > \[data-slot='dialog-footer'\] \{ flex-shrink: 0; margin-top: auto; \}/);
 assert.match(mobile,/> form > \[class\*='-body'\] \{ flex: 0 1 auto; min-height: 0; overflow-y: auto; \}/);
});

test('sheet slides vertically with restrained timing and falls back to opacity under reduced motion',()=>{
 assert.match(css,/@keyframes dialog-sheet-in \{ from \{ transform: translateY\(100%\); \}/);
 assert.match(mobile,/\[data-state='open'\] \{\s*animation: dialog-sheet-in 220ms/);
 assert.match(mobile,/\[data-state='closed'\] \{\s*animation: dialog-sheet-out 180ms/);
 assert.match(reduced,/animation: dialog-sheet-fade-in 160ms/);
 assert.match(reduced,/animation: dialog-sheet-fade-out 140ms/);
 assert.doesNotMatch(reduced,/translateY/);
 // Beats surface-motion.css `:is(...)[data-state]` (0,2,0 !important).
 assert.match(mobile,/:root \[data-slot='dialog-content'\]\[data-mobile-presentation='sheet'\]\[data-state='open'\]/);
});

test('expanded sheets pin the footer and keep natural field spacing; headers clear the grab bar',()=>{
 // A form without a growing *-body (Settings) still pins its footer at the bottom edge.
 assert.match(mobile,/> form > \[data-slot='dialog-footer'\] \{[^}]*margin-top: auto;/);
 // `+` never matched: the hidden drag-dismiss Close sits between the handle and the header.
 assert.match(mobile,/> \[data-slot='dialog-sheet-handle'\] ~ \[data-slot='dialog-header'\] \{ margin-top: 8px; \}/);
 assert.doesNotMatch(mobile,/dialog-sheet-handle'\] \+ \[data-slot='dialog-header'\]/);
 const wwm=readFileSync(new URL('../src/features/when-we-meet/when-we-meet.css',import.meta.url),'utf8');
 assert.match(wwm,/\.wwm-create-dialog \.wwm-create-body\{align-content:start\}/);
 const toolbar=readFileSync(new URL('../src/features/when-we-meet/room-toolbar.css',import.meta.url),'utf8');
 assert.match(toolbar,/\.wwm-settings-dialog \[data-slot='dialog-header'\]\{text-align:left\}/);
});
