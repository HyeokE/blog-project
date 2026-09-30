// Regressions from the 2026-10-01 Aside UI QA pass (source contracts for browser-only behavior).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const wwm=read('src/features/when-we-meet/WhenWeMeet.tsx');
const panel=read('src/features/when-we-meet/ConfirmationPanel.tsx');
const dialog=read('src/components/ui/dialog.tsx');

test('P1-1 review roster and warnings use selected-slot availability',()=>{
 assert.match(panel,/selectionAvailability\(members,responses,slots,range\)/);
 assert.match(panel,/\{reviewed\.map\(member=><li key=\{member\.id\}>/);
 assert.match(panel,/member\.response==='partial'\?member\.availability\|\|'Partly available'/);
 for(const label of ['Unavailable: ','Partly available: ','Not responded: '])assert.ok(panel.includes(label),label);
 assert.doesNotMatch(panel,/members\.some\(m=>m\.response==='not-responded'\)/);
});

test('P1-2 closing a controlled dialog returns focus to its opener',()=>{
 // Shared fallback: Radix only refocuses a DialogTrigger; controlled dialogs remember the opener at open time.
 assert.match(dialog,/const handleOpenAutoFocus=|const handleOpenAutoFocus = /);
 assert.match(dialog,/opener\.current = active instanceof HTMLElement && active !== document\.body/);
 assert.match(dialog,/if \(event\.defaultPrevented \|\| !target\?\.isConnected\) return\n\s*event\.preventDefault\(\)\n\s*target\.focus\(\)/);
 assert.match(dialog,/onCloseAutoFocus=\{handleCloseAutoFocus\}/);
 // Drag-dismiss clicks the hidden Radix Close, i.e. the same close path (and the same focus return).
 assert.match(dialog,/window\.setTimeout\(\(\) => closeRef\.current\?\.click\(\), 180\)/);
 // Explicit trigger refs for the Review and Settings dialogs.
 assert.match(panel,/<Button ref=\{reviewTrigger\}[^>]*CONFIRM_REVIEW/);
 assert.match(panel,/onCloseAutoFocus=\{event=>\{event\.preventDefault\(\);reviewTrigger\.current\?\.focus\(\)\}\}/);
 // Settings opens from the ⋯ menu: focus returns to the menu trigger.
 assert.match(readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8'),/<Button ref=\{menuTrigger\}[^>]*MEETING_MENU/);
 assert.match(wwm,/className="wwm-settings-dialog" onCloseAutoFocus=\{event=>\{event\.preventDefault\(\);menuTrigger\.current\?\.focus\(\)\}\}/);
});

test('P2-1 Everyone bar times ellipsize, then drop out on narrow bars',()=>{
 const css=read('src/features/when-we-meet/week-calendar.css');
 assert.match(css,/\.wwm-calendar-event\{container-type:inline-size\}/);
 assert.match(css,/\.wwm-event-time\{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis\}/);
 assert.match(css,/@container \(max-width:72px\)\{[^}]*\.wwm-event-time\{display:none\}\}/);
});

test('P2-6 create dialog keeps the Radix title id (aria-labelledby resolves) and focuses it by ref',()=>{
 assert.doesNotMatch(wwm,/wwm-create-title"/);
 assert.match(wwm,/<DialogTitle ref=\{createTitle\} tabIndex=\{-1\}>New meeting<\/DialogTitle>/);
 assert.match(wwm,/requestAnimationFrame\(\(\)=>createTitle\.current\?\.focus\(\)\)/);
 const css=read('src/features/when-we-meet/when-we-meet.css');
 assert.match(css,/\.wwm-create-dialog \[data-slot='dialog-title'\]\{align-self:flex-start;max-width:calc\(100% - 48px\)/);
 assert.match(css,/\.wwm-create-dialog \[data-slot='dialog-title'\]:focus\{outline:none\}\.wwm-create-dialog \[data-slot='dialog-title'\]:focus-visible\{/);
});

test('P2-8 Create stories seed dates relative to today',()=>{
 const stories=read('src/stories/wwm/wwm.stories.tsx');
 const seeded=stories.slice(stories.indexOf('const seeded='),stories.indexOf('\n',stories.indexOf('const seeded=')));
 assert.doesNotMatch(seeded,/\d{4}-\d\d-\d\d/);
 assert.match(stories,/todayInTimezone\('Asia\/Seoul'\)/);
});

test('P2-10 read-only calendars do not describe editing',()=>{
 const weekly=read('src/features/when-we-meet/WeeklyAvailability.tsx');
 assert.match(weekly,/\{readOnly\|\|selection\?'Read-only view of saved availability\.[^']*':'Click or drag to edit your availability\./);
});

test('P2-11 fill picker names its popover from the label; Undo toast stays ~10s',()=>{
 const picker=read('src/features/when-we-meet/DateRangePicker.tsx');
 assert.match(picker,/const panelLabel=ariaLabel\?\?\(label==='Dates'\?'Choose meeting dates':`Choose \$\{label\.toLowerCase\(\)\}`\);/);
 assert.match(picker,/<PopoverContent[^>]*aria-label=\{panelLabel\}/);
 const fill=read('src/features/when-we-meet/CalendarFill.tsx');
 assert.match(fill,/const UNDO_TOAST_MS=10_000;/);
 assert.match(fill,/\{duration:UNDO_TOAST_MS,action:\{label:'Undo'/);
});

test('P2-12 the pre-paint script renders as an inert block on the client',()=>{
 const layout=read('src/app/layout.tsx');
 assert.doesNotMatch(layout,/<script\b/);
 assert.match(layout,/<head>\s*<InlineScript html=\{PRE_PAINT_SCRIPT\} \/>/);
 assert.match(layout,/document\.documentElement\.setAttribute\('data-mode', mode\)/);
 const inline=read('src/components/InlineScript.tsx');
 assert.match(inline,/^'use client';/);
 // Hydration must see the same type the server sent (React matches head scripts by type); only client-created
 // instances are inert data blocks (React's script-tag warning skips data blocks).
 assert.match(inline,/useSyncExternalStore\(subscribe, \(\) => false, \(\) => true\)/);
 assert.match(inline,/type=\{serverOrHydrating \? 'text\/javascript' : 'text\/plain'\}/);
 assert.doesNotMatch(inline,/typeof window/);
 assert.match(inline,/suppressHydrationWarning/);
});
