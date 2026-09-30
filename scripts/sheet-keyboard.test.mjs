import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('bottom sheets follow the visual viewport so the on-screen keyboard never covers them',()=>{
 const dialog=read('src/components/ui/dialog.tsx');
 assert.match(dialog,/window\.visualViewport/);
 assert.match(dialog,/innerHeight - viewport\.height - viewport\.offsetTop/);
 assert.match(dialog,/addEventListener\("resize", update\)/);
 assert.match(dialog,/addEventListener\("scroll", update\)/);
 assert.match(dialog,/useSheetKeyboard\(sheet\.contentRef, mobilePresentation === "sheet"\)/);
 assert.match(dialog,/scrollIntoView\(\{ block: "nearest" \}\)/);
 const css=read('src/components/ui/dialog-sheet.css');
 assert.match(css,/\[data-sheet-keyboard\][^{]*\{[^}]*bottom: var\(--sheet-keyboard/);
 assert.match(css,/max-height: calc\(var\(--sheet-visible-height/);
});

test('phones never auto-focus a text field when a sheet or the timezone picker opens',()=>{
 const dialog=read('src/components/ui/dialog.tsx');
 assert.match(dialog,/const SHEET_MEDIA = "\(max-width: 640px\)"/);
 assert.match(dialog,/!event\.defaultPrevented && mobilePresentation === "sheet" && window\.matchMedia\(SHEET_MEDIA\)\.matches/);
 assert.match(dialog,/sheet\.contentRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
 const tz=read('src/features/when-we-meet/TimezoneCombobox.tsx');
 assert.match(tz,/onOpenAutoFocus=\{event => \{ if \(window\.matchMedia\('\(max-width: 640px\)'\)\.matches\) \{ event\.preventDefault\(\)/);
});
