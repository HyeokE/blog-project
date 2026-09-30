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

test('a UTC report (fingerprinting protection) falls back to Seoul for Korean UI only',async()=>{
 const zones=await import('../src/features/when-we-meet/timezone-options.mjs');
 const reporting=timeZone=>({DateTimeFormat:()=>({resolvedOptions:()=>({timeZone})})});
 assert.equal(zones.deviceTimezone(reporting('UTC'),'ko'),'Asia/Seoul');
 assert.equal(zones.deviceTimezone(reporting('Etc/UTC'),'ko'),'Asia/Seoul');
 assert.equal(zones.deviceTimezone(reporting('UTC'),'en'),'UTC');
 assert.equal(zones.deviceTimezone(reporting('America/New_York'),'ko'),'America/New_York');
});
