import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('room editing connects autosave instead of manual save',()=>{assert.match(source,/useAvailabilitySync/);assert.doesNotMatch(source,/>Save availability</);assert.match(source,/onToggle=\{sync.toggle\}/)});
test('share and settings replace invite and inline name form',()=>{assert.match(source,/aria-label="Share invitation link"/);assert.match(source,/<Share2/);assert.match(source,/>Settings</);assert.match(source,/wwm-settings-dialog/);assert.doesNotMatch(source,/id="wwm-room-name"/)});
