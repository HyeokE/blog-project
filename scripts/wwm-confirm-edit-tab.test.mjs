import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {normalizeConfirmationResponse,confirmPanelState,confirmUpdateBody,openEditBody,resendFailure,confirmFailure} from '../src/features/when-we-meet/confirm-tab.mjs';
import {normalizeConfirmation,normalizeConfirmationDetail} from '../src/features/when-we-meet/normalize.mjs';

const room={title:'Team coffee',startDate:'2026-10-01',endDate:'2026-10-02',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul'};
const slots=makeSlots(room);
const A='11111111-1111-4111-8111-111111111111',B='33333333-3333-4333-8333-333333333333',C='44444444-4444-4444-8444-444444444444';
const attendees=[{userId:A,name:'Alex',email:'a@example.test',hasAvailability:true,isOrganizer:true},{userId:B,name:'Morgan',email:'m@example.test',hasAvailability:true,isOrganizer:false},{userId:C,name:'Taylor',email:'t@example.test',hasAvailability:false,isOrganizer:false}];
const record={status:'confirmed',title:'Kickoff',startsAt:'2026-10-01T01:00:00.000Z',endsAt:'2026-10-01T01:30:00.000Z',timezone:'Asia/Seoul',googleEventUrl:'https://www.google.com/calendar/event?eid=1',revision:2};
const edit={revision:2,recipientIds:[A,B],excludedIds:[],optionalIds:[B],open:null,lastResentAt:null};
const raw=(over={})=>({confirmation:record,review:{calendarConnected:true,organizerEmail:'a@example.test',attendees,edit,...over}});

test('server normalizers map revision and owner edit detail rows to camelCase',()=>{
 assert.equal(normalizeConfirmation({status:'confirmed',title:'T',starts_at:'x',ends_at:'y',timezone:'Z',google_event_url:null,revision:3}).revision,3);
 assert.equal('revision' in normalizeConfirmation({status:'confirmed',title:'T',starts_at:'x',ends_at:'y',timezone:'Z',google_event_url:null}),false);
 const detail=normalizeConfirmationDetail({revision:2,recipient_ids:[A,B],excluded_ids:[],optional_ids:[B],open_revision:3,open_status:'reconciling',open_title:'New',open_starts_at:'2026-10-01T02:00:00+00:00',open_ends_at:'2026-10-01T03:00:00+00:00',open_recipient_ids:[A],open_excluded_ids:[B],open_optional_ids:[],last_resent_at:null});
 assert.deepEqual(detail,{revision:2,recipientIds:[A,B],excludedIds:[],optionalIds:[B],open:{revision:3,status:'reconciling',title:'New',startsAt:'2026-10-01T02:00:00.000Z',endsAt:'2026-10-01T03:00:00.000Z',recipientIds:[A],excludedIds:[B],optionalIds:[]},lastResentAt:null});
 assert.equal(normalizeConfirmationDetail({revision:1,recipient_ids:[A],excluded_ids:[],optional_ids:[],open_revision:null,last_resent_at:null}).open,null);
 assert.equal(normalizeConfirmationDetail(undefined),null);
});

test('the client validates edit detail and keeps it owner-only',()=>{
 const data=normalizeConfirmationResponse(raw());
 assert.equal(data.confirmation.revision,2);
 assert.deepEqual(data.review.edit,edit);
 assert.equal(normalizeConfirmationResponse(raw({edit:undefined})).review.edit,null);
 assert.throws(()=>normalizeConfirmationResponse(raw({edit:{revision:'2'}})));
 assert.throws(()=>normalizeConfirmationResponse(raw({edit:{...edit,recipientIds:'x'}})));
});

test('owner panel: confirmed record names the snapshot recipients and prefills the edit review',()=>{
 const state=confirmPanelState({data:normalizeConfirmationResponse(raw()),slots});
 assert.equal(state.status,'confirmed');
 assert.deepEqual(state.confirmation.attendeeNames,['Alex','Morgan']);
 assert.equal(state.confirmation.updated,true);
 assert.deepEqual(state.edit,{baseRevision:2,initial:{title:'Kickoff',date:'2026-10-01',start:'10:00',end:'10:30',excludedIds:[C],optionalIds:[B]},status:'idle',lastResentAt:null});
});

test('owner panel: an open edit shows as reconciling with a same-payload retry body',()=>{
 const open={revision:3,status:'reconciling',title:'Moved',startsAt:'2026-10-02T05:00:00.000Z',endsAt:'2026-10-02T06:00:00.000Z',recipientIds:[A,C],excludedIds:[B],optionalIds:[C]};
 const data=normalizeConfirmationResponse(raw({edit:{...edit,open}}));
 const state=confirmPanelState({data,slots});
 assert.equal(state.status,'confirmed');
 assert.equal(state.edit.status,'reconciling');
 assert.deepEqual(openEditBody(data,slots),{title:'Moved',date:'2026-10-02',start:open.startsAt,end:open.endsAt,recipients:[A,C],excluded:[B],optional:[C],baseRevision:2});
 assert.equal(openEditBody(normalizeConfirmationResponse(raw()),slots),null);
});

test('members see the updated details and an updated note but never edit data',()=>{
 const state=confirmPanelState({data:normalizeConfirmationResponse({confirmation:record,review:null}),slots,organizerName:'Alex'});
 assert.equal(state.role,'member');
 assert.equal(state.confirmation.title,'Kickoff');
 assert.equal(state.confirmation.updated,true);
 assert.equal(state.edit,undefined);
 const first=confirmPanelState({data:normalizeConfirmationResponse({confirmation:{...record,revision:1},review:null}),slots});
 assert.equal(first.confirmation.updated,undefined);
});

test('without edit detail (migration not applied) the owner sees no edit controls',()=>{
 const state=confirmPanelState({data:normalizeConfirmationResponse(raw({edit:null})),slots});
 assert.equal(state.edit,undefined);
});

test('the update body is the confirmation body plus the edited base revision',()=>{
 const body=confirmUpdateBody({title:'Team coffee',baseRevision:2,slots,attendeeIds:[A,B,C],proposal:{date:'2026-10-01',start:'11:00',end:'12:00',recipientIds:[A,B],excludedIds:[C],optionalIds:[B],title:' Moved '}});
 assert.deepEqual(body,{title:'Moved',date:'2026-10-01',start:'2026-10-01T02:00:00.000Z',end:'2026-10-01T03:00:00.000Z',recipients:[A,B],excluded:[C],optional:[B],baseRevision:2});
 assert.throws(()=>confirmUpdateBody({title:'x',baseRevision:0,slots,attendeeIds:[A],proposal:{date:'2026-10-01',start:'11:00',end:'12:00',recipientIds:[A],excludedIds:[]}}));
});

test('resend failures map to inline messages; a rate limit is not an error state for the meeting',()=>{
 assert.deepEqual(resendFailure({status:429,message:'Invitations were just sent. Try again in a minute.'}),{status:'failed',error:'Invitations were just sent. Try again in a minute.'});
 assert.equal(resendFailure({status:409,reconnect:true,message:'Connect'}).calendar,'disconnected');
 assert.match(resendFailure(new Error('offline')).error,/Try again in a minute/);
 assert.equal(confirmFailure({status:409,message:'This meeting changed since you opened it. Reload and review again.'}).error,'This meeting changed since you opened it. Reload and review again.');
});

test('the panel exposes owner-only Edit; Resend moved to the header menu behind a confirm dialog',()=>{
 const s=readFileSync(new URL('../src/features/when-we-meet/ConfirmationPanel.tsx',import.meta.url),'utf8');
 const chrome=readFileSync(new URL('../src/features/when-we-meet/RoomChrome.tsx',import.meta.url),'utf8');
 assert.match(s,/Edit meeting/);assert.doesNotMatch(s,/Resend/);assert.match(s,/Save &amp; notify attendees/);
 assert.match(s,/owner&&edit&&/);
 assert.match(s,/ANALYTICS_ELEMENTS\.CONFIRM_EDIT\b/);
 assert.match(chrome,/\{resend&&confirmed&&<DropdownMenuItem data-analytics-label=\{ANALYTICS_ELEMENTS\.CONFIRM_RESEND\} onSelect=\{askResend\}>Resend invitations…<\/DropdownMenuItem>\}/);
 assert.match(chrome,/<DialogTitle>\{resendQuestion\(count\)\}<\/DialogTitle>/);
 assert.match(chrome,/toast\.success\(MEETING_TOASTS\.resent\)/);assert.match(s,/ANALYTICS_ELEMENTS\.CONFIRM_EDIT_SAVE\b/);
 assert.match(s,/Updated by the organizer/);
});
