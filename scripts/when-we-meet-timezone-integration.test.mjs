import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateRoom} from '../src/features/when-we-meet/domain.mjs';
const form=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('creation field mounts the timezone selector with committed draft state and meeting date',()=>{
  assert.match(form,/import\s*\{\s*TimezoneCombobox\s*\}/);
  assert.match(form,/<TimezoneCombobox id="wwm-create-timezone" required value=\{form\.timezone\} onChange=\{timezone=>setForm\(old=>\(\{\.\.\.old,timezone\}\)\)\} referenceDate=\{form\.startDate\}/);
  assert.doesNotMatch(form,/<Input id="wwm-create-timezone"/);
});
test('a restored unsupported zone is rejected at submission instead of silently changed',()=>{
  const valid={title:'Coffee',startDate:'2026-10-01',endDate:'2026-10-01',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul'};
  assert.equal(validateRoom(valid),null);
  assert.equal(validateRoom({...valid,timezone:'Not/A_Zone'}),'Choose a valid timezone.');
});
