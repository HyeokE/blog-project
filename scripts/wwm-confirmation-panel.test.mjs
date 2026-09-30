import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=()=>readFileSync(new URL('../src/features/when-we-meet/ConfirmationPanel.tsx',import.meta.url),'utf8');
test('confirmation UI requires explicit review and send callbacks, without fetch',()=>{const s=source();assert.match(s,/onConfirm:/);assert.match(s,/onConnectCalendar:/);assert.match(s,/Confirm &amp; send invitations/);assert.doesNotMatch(s,/\bfetch\s*\(/);});
test('recipient exclusions and missing addresses are reviewed',()=>{const s=source();assert.match(s,/excludedIds/);assert.match(s,/Missing email/);assert.match(s,/Not responded/);assert.match(s,/Unavailable/);});
