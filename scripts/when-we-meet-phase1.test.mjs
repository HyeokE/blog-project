import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {formatCraftDate, formatCraftInstant} from '../src/features/when-we-meet/display-date.mjs';
import {slotLabel} from '../src/features/when-we-meet/schedule-view.mjs';
const src=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('calendar dates preserve their day and pad both components',()=>{assert.equal(formatCraftDate('2026-01-02'),'2026.01.02');assert.equal(formatCraftDate('2026-12-31'),'2026.12.31')});
test('instant formats at the room timezone even across calendar boundary',()=>{assert.equal(formatCraftInstant('2026-09-30T15:30:00Z','Asia/Seoul'),'2026.10.01 00:30')});
test('personal slots expose selection, group slots expose counts',()=>{assert.equal(slotLabel('mine',true,1,2),'Selected');assert.equal(slotLabel('mine',false,1,2),'Not selected');assert.equal(slotLabel('overlap',false,1,2),'1/2 available')});
test('tabs use one active treatment and a shared toast host',()=>{assert.doesNotMatch(src,/wwm-active-tab/);assert.match(readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8'),/toast\.success\(copied\)/);assert.match(readFileSync(new URL('../src/app/craft/layout.tsx',import.meta.url),'utf8'),/<Toaster\s*\/>/)});
test('purposeful English tabs and a header invite without bottom sharing',()=>{
 // Current room tabs: Availability / Everyone / People (a Confirm tab may be added later).
 assert.match(src,/copyLink\(inviteShareText\(link,name\),MEETING_TOASTS\.linkCopied\)/);assert.match(src,/const tabNames=\{availability:t\('room\.tabs\.availability'\),everyone:t\('room\.tabs\.everyone'\),people:t\('room\.tabs\.people'\)(?:,[a-z]+:t\('room\.tabs\.[a-z]+'\))?\} as const/);
 for(const gone of ['Overlap','Suggestions'])assert.ok(!src.includes(`'${gone}'`),`superseded tab ${gone}`);
 assert.match(src,/<RoomHeader [^>]*onInvite=\{\(\)=>void invite\(\)\}/);
 assert.match(readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8'),/<div className="wwm-header-actions">\s*<Button type="button" variant="outline"[^>]*onClick=\{onInvite\}><Link2 aria-hidden="true"\/><span className="wwm-invite-label">\{t\('room\.invite'\)\}<\/span><\/Button>/);
 assert.doesNotMatch(src,/<h2>공유<\/h2>/);
 const people=readFileSync(new URL('../src/features/when-we-meet/PeoplePanel.tsx',import.meta.url),'utf8');
 assert.match(people,/t\('people\.loadFailed'\)/);
 assert.match(people,/<Notice tone="error"[^]*onClick=\{retry\}/);
});
