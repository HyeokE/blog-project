import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRoom} from '../src/features/when-we-meet/domain.mjs';
const form=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('creation field mounts the timezone selector with committed draft state and meeting date',()=>{
  assert.match(form,/import\s*\{\s*TimezoneCombobox\s*\}/);
  // Commit goes through updateForm and re-derives "today" for the new zone; the meeting start date is the DST reference.
  assert.match(form,/<TimezoneCombobox id="wwm-create-timezone" required value=\{form\.timezone\} onChange=\{timezone=>\{updateForm\('timezone',timezone,'timezone'\);clearField\('dates'\);setToday\(todayInTimezone\(timezone\)\|\|''\)\}\}[^\n]*? referenceDate=\{form\.startDate\}\/>/);
  // Device timezone is the default, with no separate "Use device timezone" shortcut.
  assert.match(form,/defaultTimezone\.current=deviceTimezone\(Intl,locale\)/);
  assert.doesNotMatch(form,/setForm\(initial\)/);
  assert.match(form,/setForm\(\{...initial,timezone:defaultTimezone\.current\}\)/);
  assert.doesNotMatch(form,/Use device timezone/i);
  assert.doesNotMatch(form,/<Input id="wwm-create-timezone"/);
});
test('a restored unsupported zone is rejected at submission instead of silently changed',()=>{
  const valid={title:'Coffee',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul'};
  assert.equal(validateRoom(valid),null);
  assert.equal(validateRoom({...valid,timezone:'Not/A_Zone'}),'Choose a valid timezone.');
});
