import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('room editing connects autosave instead of manual save',()=>{assert.match(source,/useAvailabilitySync/);assert.doesNotMatch(source,/>Save availability</);assert.match(source,/onToggle=\{sync.toggle\}/)});
test('Invite and a ⋯ menu with Settings replace the inline name form',()=>{const chrome=readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8');assert.match(chrome,/>Invite<\/span><\/Button>/);assert.match(chrome,/<DropdownMenuTrigger asChild><Button[^>]*aria-label="Meeting options"/);assert.match(chrome,/onSelect=\{onSettings\}>Settings</);assert.match(source,/wwm-settings-dialog/);assert.doesNotMatch(source,/id="wwm-room-name"/)});
