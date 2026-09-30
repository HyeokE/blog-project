import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/features/when-we-meet/when-we-meet.css',import.meta.url),'utf8');
const component=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('room title owns metadata and header actions without redundant headings',()=>{
 assert.doesNotMatch(component,/wwm-eyebrow/);
 // Availability autosaves (useAvailabilitySync); the explicit Save button is superseded. Status sits outside the tabs.
 assert.doesNotMatch(component,/Save availability<\/Button>/);
 // Compact status shares the tab row (beside the tabs, outside the panels).
 assert.match(component,/<div className="wwm-tabs-row"><TabsList[^\n]*<\/TabsList>\n[^\n]*\n\s*\{\(view==="availability"\|\|save\.tone!=="idle"\)&&<div className="wwm-save-state" data-tone=\{save\.tone\}><span className="wwm-sr-only" role="status">/);
 // One live sentence; the visible line with the rolling count is hidden from AT so the number is not announced twice.
 assert.match(component,/<span aria-hidden="true">\{save\.text&&<>\{save\.text\} · <\/>\}<RollingNumber value=\{mine\.length\}\/> selected<\/span>/);
 assert.match(component,/role="status">\{save\.text\?`\$\{save\.text\} · \$\{mine\.length\} selected`:''\}/);
 // Metadata line sits directly under the room title (h1).
 const chrome=readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8');
 assert.match(chrome,/<h1>\{title\}<\/h1>/);
 // Meta: date range · timezone (the only timezone in the view); no "Live updates" text, only an Offline dot.
 assert.match(chrome,/<p className="wwm-room-meta"><span>\{compactRange\(startDate,endDate\)\}<span aria-hidden="true"> · <\/span>\{timezone\}<\/span>\{confirmed&&confirmation&&<Badge variant="outline" className="wwm-room-chip">[^\n]*\{offline&&/);
 assert.doesNotMatch(component+chrome,/Live updates|Connecting…/);
 assert.doesNotMatch(component,/<div className="wwm-heading"><div><h2>시간표<\/h2>/);
});
test('room uses the continuous scrolling availability calendar instead of the superseded standalone calendar',()=>{
 const weekly=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
 assert.match(component,/<WeeklyAvailability\b/);
 assert.doesNotMatch(component,/calendarOpen&&<motion\.div/);
 // Previous/Next week paging was replaced by one horizontally scrolling calendar containing every room date.
 assert.doesNotMatch(weekly,/aria-label="(?:Previous|Next) week"/);
 // The scroller is not a Tab stop of its own: the ARIA grid inside it is the one Tab stop and focus scrolls it.
 assert.match(weekly,/<div className="wwm-week-scroll" ref=\{scroller\} onScroll=\{onScroll\}/);
 assert.match(weekly,/role="grid" aria-label=\{label\}/);
 assert.match(weekly,/\{dates\.map\(\(date,column\)=><div className="wwm-calendar-day"/);
 // Scrolling dismisses any open detail popover.
 assert.match(weekly,/const onScroll=\(event:React\.UIEvent<HTMLDivElement>\)=>\{[^\n]*setDetail\(null\)\};/);
});
test('room tabs present a visible yet restrained transition',()=>{
 // Radix zeroes animation-duration on TabsContent mount, so the fade lives on an inner wrapper keyed by the tab.
 assert.match(css,/\.wwm-tab-reveal\{animation:wwm-tab-reveal \.22s/);
 assert.doesNotMatch(css,/\.wwm-tab-panel\{animation/);
 assert.match(component,/<TabsContent value=\{view\} className="wwm-tab-panel"><div className="wwm-tab-reveal" key=\{view\}>/);
 assert.doesNotMatch(component,/<TabsContent[^>]*key=/);
 assert.match(css,/@keyframes wwm-tab-reveal\{from\{opacity:\.35\}to\{opacity:1\}\}/);
 assert.doesNotMatch(css,/@keyframes wwm-tab-reveal\{[^}]*translateY/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.wwm-tab-reveal\{animation:none!important\}\}/);
 assert.doesNotMatch(component,/wwm-active-tab/);
 assert.match(css,/\.wwm \.wwm-view-switch \[data-slot='tabs-trigger'\]::after\{display:none/);
});
test('tab strip avoids transient scrollbars while timetable keeps styled native scrolling',()=>{
 assert.match(css,/\.wwm-view-switch\{overflow:visible/);
 assert.match(css,/\.wwm-scroll,\.wwm-time-options\{scrollbar-width:thin;scrollbar-color:/);
 assert.match(css,/\.wwm-scroll::-webkit-scrollbar\{width:8px;height:8px\}/);
});
test('Craft and WWM bounded surfaces use a scoped four-pixel token',()=>{
 assert.match(css,/--craft-control-radius:4px/);
 assert.match(css,/\.wwm-card[^\n]*border-radius:var\(--craft-control-radius\)/);
 const craft=readFileSync(new URL('../src/app/craft/craft.css',import.meta.url),'utf8');
 assert.match(craft,/--craft-control-radius:4px/);
 assert.match(craft,/\.craft-account-avatar\{width:42px;height:42px;border-radius:50%/);
});

test('room tab underline slides horizontally (one indicator, transform/width only, reduced-motion aware)',()=>{
 const toolbar=readFileSync(new URL('../src/features/when-we-meet/room-toolbar.css',import.meta.url),'utf8');
 assert.match(component,/<TabIndicator value=\{view\}\/><\/TabsList>/);
 assert.match(component,/bar\.style\.transform=`translateX\(\$\{active\.offsetLeft\}px\)`/);
 assert.doesNotMatch(component,/translateY/);
 assert.match(toolbar,/\.wwm-tab-indicator\[data-animate\]\{transition:transform \.2s ease-out,width \.2s ease-out\}/);
 assert.match(toolbar,/@media\(prefers-reduced-motion:reduce\)\{\.wwm\.wwm-room \.wwm-view-switch \.wwm-tab-indicator\[data-animate\]\{transition:none\}\}/);
 assert.match(toolbar,/\[data-slot='tabs-trigger'\]\[data-state='active'\]\{background:transparent;color:var\(--craft-ink\);border-bottom-color:transparent;font-weight:var\(--craft-fw-semibold\)\}/);
 assert.match(toolbar,/\[data-slot='tabs-trigger'\]\{[^}]*height:var\(--craft-h-md\);[^}]*color:var\(--craft-muted\);[^}]*font-weight:var\(--craft-fw-medium\)/);
 assert.doesNotMatch(toolbar,/font-weight:650/);
});
test('tabs keep Radix ids so aria-controls / aria-labelledby resolve',()=>{
 assert.doesNotMatch(component,/<TabsTrigger[^>]*\sid=/);
 assert.doesNotMatch(component,/<TabsContent[^>]*\sid=/);
});
