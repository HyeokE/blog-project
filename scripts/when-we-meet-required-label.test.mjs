import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const label=read('../src/components/craft/RequiredFieldLabel.tsx');
const css=read('../src/app/craft/design-system.css');
const form=read('../src/features/when-we-meet/WhenWeMeet.tsx');
const range=read('../src/features/when-we-meet/DateRangePicker.tsx');
const time=read('../src/features/when-we-meet/DateTimePicker.tsx');
test('shared label composes shadcn Label and decorates only required fields',()=>{
 assert.match(label,/import\s*\{Label\}\s*from\s*['"]@\/components\/ui\/label['"]/);
 assert.match(label,/required\s*&&\s*<span[^>]*aria-hidden="true"/);
 assert.match(label,/htmlFor=\{htmlFor\}/);
 assert.match(css,/\.craft-required-dot\{[^}]*width:4px;[^}]*height:4px;[^}]*border-radius:50%/);
 assert.match(css,/--craft-required:/);
});
test('create and join fields use shared label while retaining input required',()=>{
 // Create fields and the room-name settings field live in WhenWeMeet; the join name field moved to InvitationLanding.
 // The invite token now comes from the URL (?invite=), so there is no token input any more.
 for(const id of ['wwm-create-title-input','wwm-create-timezone','wwm-create-name','wwm-settings-name']) assert.match(form,new RegExp(`<RequiredFieldLabel required htmlFor="${id}"`));
 assert.match(form,/<Input id="wwm-create-title-input"[^>]*required/);
 assert.match(form,/<Input id="wwm-create-name"[^>]*required/);
 assert.match(form,/<Input id="wwm-settings-name"[^>]*required/);
 assert.doesNotMatch(form,/wwm-join-token/);
 const join=read('../src/features/when-we-meet/InvitationLanding.tsx');
 assert.match(join,/<Input id="wwm-join-name"[^>]*required/);
 assert.match(join,/<RequiredFieldLabel required htmlFor="wwm-join-name"/,'join name must use the shared RequiredFieldLabel like the create fields');
});
test('custom range and time triggers expose required semantics',()=>{
 // Required by default (create form); optional pickers such as "Dates to fill" pass required={false}.
 assert.match(range,/required=true/);
 assert.match(range,/aria-required=\{required\|\|undefined\}/);
 assert.match(range,/<RequiredFieldLabel required=\{required\}/);
 assert.match(time,/aria-required="true"/);
 assert.match(range,/RequiredFieldLabel/);
 assert.match(time,/RequiredFieldLabel/);
});
