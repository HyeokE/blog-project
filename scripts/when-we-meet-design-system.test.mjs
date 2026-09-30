import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const feature=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
const account=readFileSync(new URL('../src/app/craft/CraftAccount.tsx',import.meta.url),'utf8');
test('Craft uses shadcn controls in live form and room actions',()=>{
 // Availability autosaves via useAvailabilitySync; the explicit Save button was superseded. Room/form actions stay shadcn Buttons.
 assert.doesNotMatch(feature,/onClick=\{save\}/);
 assert.match(feature,/<Button[^>]*onClick=\{sync\.retry\}>Retry<\/Button>/);
 assert.match(feature,/<Button[^>]*disabled=\{!configured\|\|busy\|\|accountLoading\}>\{busy\?'Creating…':'Create room'\}<\/Button>/);
 assert.doesNotMatch(feature,/<button\b/,'WhenWeMeet must not render raw <button> controls');
 assert.match(feature,/<Input[^>]*value=\{form\.title\}/);
 assert.match(feature,/<Tabs[^>]*value=\{view\}/);
});
test('shared profile uses Radix dropdown and real button',()=>{
 assert.match(account,/<DropdownMenu/);
 assert.match(account,/<DropdownMenuItem/);
 assert.match(account,/<Button/);
});
test('shared count rolls in room status and recommendations, not calendar date',()=>{
 // Recommendations tab was removed (tabs: Availability / Everyone / People); the room status selection count still rolls.
 assert.match(feature,/<RollingNumber value=\{mine\.length\}\/> selected/);
 assert.doesNotMatch(feature,/Suggestions|recommendations:/);
 const weekly=readFileSync(new URL('../src/features/when-we-meet/WeeklyAvailability.tsx',import.meta.url),'utf8');
 const count=readFileSync(new URL('../src/features/when-we-meet/ParticipantCount.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(weekly,/RollingNumber/,'calendar dates/times must not animate');
 // Participant count is a static icon + number, not a rolling animation.
 assert.doesNotMatch(count,/RollingNumber/);
 assert.match(count,/<Users[^>]*aria-hidden="true"\/><span>\{known\?count:'—'\}<\/span>/);
});
