import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('owned list and guest entry share a Radix create dialog, not an inline form',()=>{
 assert.match(source,/Dialog open=\{showCreate\}/);
 assert.match(source,/DialogContent className="wwm-create-dialog"/);
 assert.match(source,/Create a meeting<\/Button>/);
 assert.doesNotMatch(source,/<section className="wwm-card"><h2>Create a (?:room|meeting)<\/h2>/);
 assert.match(source,/<form id="wwm-create-form" noValidate[^>]*onSubmit=\{create\}>/);
 // Create failures stay inside the dialog as an alert; success closes it and opens one "{Title} is ready" dialog (no toast).
 assert.match(source,/catch\(e\)\{setCreateError\(\(e as Error\)\.message\);setStatus\(''\);\}/);
 assert.match(source,/<div id="wwm-create-status"[^>]*role=\{createError\?'alert':'status'\}/);
 assert.match(source,/setCreated\(\{id:result\.id,title:form\.title\.trim\(\),link:`\$\{window\.location\.origin\}\/craft\/when-we-meet\/\$\{result\.id\}\?invite=\$\{result\.inviteToken\}`,summary:meetingSummary\(form\)\}\)/);
 assert.match(source,/<CreatedMeetingDialog meeting=\{created\}/);
 assert.doesNotMatch(source,/Room created/);
 const chrome=readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8');
 assert.match(chrome,/<DialogTitle><span className="wwm-ready-name">\{meeting\.title\}<\/span> is ready<\/DialogTitle>/);
 assert.match(chrome,/>Open meeting<\/Button>/);
 // One copy affordance: the inline Copy beside the link (no duplicate footer button).
 assert.doesNotMatch(chrome,/>Copy link<\/Button>/);
 assert.match(chrome,/\{copied\?'Copied':'Copy'\}/);
 // Guest CTA is "Create a meeting"; signed-in CTA is "New meeting".
 assert.match(source,/!accountLoading&&!profile&&<>[^\n]*?className="wwm-guest-create"[^\n]*?>Create a meeting<\/Button>/);
 assert.match(source,/!roomId&&profile&&<Button className="wwm-new-meeting"[^\n]*?>New meeting<\/Button>/);
});
test('creation guards pending and auth uncertainty and only closes after success',()=>{
 assert.match(source,/if\(busy\|\|accountLoading\|\|createPending\.current\)\{return;\}/);
 assert.match(source,/if\(!profile\)\{saveDraft/);
 assert.match(source,/setShowCreate\(false\);setForm\(initial\)/);
 assert.match(source,/onEscapeKeyDown=\{e=>\{if\(busy\|\|document\.querySelector\('\.wwm-range>\.wwm-picker-trigger\[aria-expanded="true"\]'\)\)\{e\.preventDefault\(\)\}\}\}/);
});
