import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
test('owned list and guest entry share a Radix create dialog, not an inline form',()=>{
 assert.match(source,/Dialog open=\{showCreate\}/);
 assert.match(source,/DialogContent className="wwm-create-dialog"/);
 assert.match(source,/\{t\('guest\.createMeeting'\)\}<\/Button>/);
 assert.doesNotMatch(source,/<section className="wwm-card"><h2>Create a (?:room|meeting)<\/h2>/);
 assert.match(source,/<form id="wwm-create-form" noValidate[^>]*onSubmit=\{create\}>/);
 // Create failures stay inside the dialog as an alert (dictionary copy by status, never raw server text); success closes it and opens one "{Title} is ready" dialog (no toast).
 assert.match(source,/catch\(e\)\{(?:funnelSignal\('create','submit_failed'\);)?setCreateError\(copy\.apiError\(e,'create'\)\);setStatus\(''\);\}/);
 assert.match(source,/<div id="wwm-create-status"[^>]*role=\{createError\?'alert':'status'\}/);
 assert.match(source,/setCreated\(\{id:result\.id,title:form\.title\.trim\(\),link:`\$\{window\.location\.origin\}\/craft\/when-we-meet\/\$\{result\.id\}\?invite=\$\{result\.inviteToken\}`,summary:meetingSummary\(form\)\}\)/);
 assert.match(source,/<CreatedMeetingDialog meeting=\{created\}/);
 assert.doesNotMatch(source,/Room created/);
 const chrome=readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8');
 assert.match(chrome,/<DialogTitle>\{rich\(t\('create\.readyTitle',\{title:RICH_SLOT\}\),RICH_SLOT,<span className="wwm-ready-name">\{meeting\.title\}<\/span>\)\}<\/DialogTitle>/);
 assert.match(chrome,/>\{t\('create\.openMeeting'\)\}<\/Button>/);
 // One copy affordance: the inline Copy beside the link (no duplicate footer button).
 assert.doesNotMatch(chrome,/>Copy link<\/Button>|copyLink'\)\}<\/Button>/);
 assert.match(chrome,/\{copied\?t\('create\.copied'\):t\('create\.copy'\)\}/);
 // Guest CTA is "Create a meeting" (guest.createMeeting); signed-in CTA is "New meeting" (list.newMeeting).
 assert.match(source,/!accountLoading&&!profile&&<>[^\n]*?className="wwm-guest-create"[^\n]*?>\{t\('guest\.createMeeting'\)\}<\/Button>/);
 assert.match(source,/!roomId&&profile&&<Button className="wwm-new-meeting"[^\n]*?>\{t\('list\.newMeeting'\)\}<\/Button>/);
});
test('creation guards pending and auth uncertainty and only closes after success',()=>{
 assert.match(source,/if\(busy\|\|accountLoading\|\|createPending\.current\)\{return;\}/);
 assert.match(source,/if\(!profile\)\{(?:funnelSignal\('create','login_prompt'\);funnelEnd\('create','sign_in_prompt'\);)?saveDraft/);
 assert.match(source,/setShowCreate\(false\);setForm\(\{...initial,timezone:defaultTimezone\.current\}\)/);
 assert.match(source,/onEscapeKeyDown=\{e=>\{if\(busy\|\|document\.querySelector\('\.wwm-range>\.wwm-picker-trigger\[aria-expanded="true"\]'\)\)\{e\.preventDefault\(\)\}\}\}/);
});
