import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('owned list and guest entry share a Radix create dialog, not an inline form',()=>{
 assert.match(source,/Dialog open=\{showCreate\}/);
 assert.match(source,/DialogContent className="wwm-create-dialog"/);
 assert.match(source,/Create a room<\/Button>/);
 assert.doesNotMatch(source,/<section className="wwm-card"><h2>Create a room<\/h2>/);
 assert.match(source,/<form id="wwm-create-form" noValidate onSubmit=\{create\}>/);
 assert.match(source,/function reportCreateError\(message:string\)/);
});
test('creation guards pending and auth uncertainty and only closes after success',()=>{
 assert.match(source,/if\(busy\|\|accountLoading\|\|createPending\.current\)\{return;\}/);
 assert.match(source,/if\(!profile\)\{saveDraft/);
 assert.match(source,/setShowCreate\(false\);setForm\(initial\)/);
 assert.match(source,/onEscapeKeyDown=\{e=>\{if\(busy\|\|document\.querySelector\('\.wwm-range>\.wwm-picker-trigger\[aria-expanded="true"\]'\)\)\{e\.preventDefault\(\)\}\}\}/);
});
