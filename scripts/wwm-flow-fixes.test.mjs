import test from 'node:test';
import assert from 'node:assert/strict';
import {selectionDrift} from '../src/features/when-we-meet/confirm-selection.mjs';
import {normalizeInvitationPreview} from '../src/features/when-we-meet/normalize.mjs';
import {creationErrors} from '../src/features/when-we-meet/creation-validation.mjs';
import {dayTime,loadErrorTitle,MEETING_COPY} from '../src/features/when-we-meet/meeting-copy.mjs';

test('selectionDrift: someone available when the time was chosen is no longer available',()=>{
 const was=[{id:'a',response:'available'},{id:'m',response:'available'},{id:'t',response:'not-responded'}];
 assert.equal(selectionDrift(was,[{id:'a',response:'available'},{id:'m',response:'partial'},{id:'t',response:'not-responded'}]),true);
 assert.equal(selectionDrift(was,[{id:'a',response:'available'},{id:'m',response:'available'},{id:'t',response:'available'}]),false);
 assert.equal(selectionDrift(was,[{id:'a',response:'available'}]),false,'a member who left is not a drift');
 assert.equal(selectionDrift(null,was),false);
});
test('invitation preview row → camelCase; anything else (mismatched token) → null',()=>{
 assert.deepEqual(normalizeInvitationPreview([{title:'Team coffee',start_date:'2026-10-01',end_date:'2026-10-03',timezone:'Asia/Seoul',organizer_name:'Alex'}]),{title:'Team coffee',startDate:'2026-10-01',endDate:'2026-10-03',timezone:'Asia/Seoul',organizerName:'Alex'});
 assert.deepEqual(normalizeInvitationPreview({title:'T',start_date:'2026-10-01',end_date:'2026-10-01',timezone:'UTC',organizer_name:null}),{title:'T',startDate:'2026-10-01',endDate:'2026-10-01',timezone:'UTC',organizerName:null});
 assert.equal(normalizeInvitationPreview([]),null);
 assert.equal(normalizeInvitationPreview(null),null);
 assert.equal(normalizeInvitationPreview([{title:'T'}]),null);
});
test('copy: one title error (maxLength enforces the limit), one date+time format, load error names the meeting',()=>{
 assert.equal(creationErrors({title:' ',startDate:'',endDate:'',timezone:'UTC',name:'A'},new Date('2026-10-01T00:00:00Z')).title,MEETING_COPY.titleError);
 assert.equal(MEETING_COPY.titleError,'Enter a title');
 assert.equal(dayTime({date:'2026-09-30',start:'10:00',end:'10:30'}),'Wed, Sep 30 · 10:00–10:30');
 assert.equal(dayTime({date:'2026-09-30'}),'Wed, Sep 30');
 assert.equal(loadErrorTitle('Team coffee'),'Couldn’t load Team coffee');
 assert.equal(loadErrorTitle(''),'Couldn’t load this meeting');
});
