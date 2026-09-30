import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as zones from '../src/features/when-we-meet/timezone-options.mjs';
import {readFileSync} from 'node:fs';
test('device timezone is detected with safe UTC fallback',()=>{
 assert.equal(typeof zones.deviceTimezone,'function');
 for(const zone of ['America/New_York','Asia/Seoul','Europe/London']) assert.equal(zones.deviceTimezone({DateTimeFormat:()=>({resolvedOptions:()=>({timeZone:zone})})}),zone);
 assert.equal(zones.deviceTimezone({DateTimeFormat:()=>{throw Error('unavailable')}}),'UTC');
 assert.equal(zones.deviceTimezone({DateTimeFormat:()=>({resolvedOptions:()=>({timeZone:'Invalid/Zone'})})}),'UTC');
});
test('timezone menu has no device update shortcut',()=>{
 assert.doesNotMatch(readFileSync(new URL('../src/features/when-we-meet/TimezoneCombobox.tsx',import.meta.url),'utf8'),/Use device timezone/);
});
