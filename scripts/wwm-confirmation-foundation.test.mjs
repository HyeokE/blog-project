import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateConfirmation,buildCalendarInsert,confirmationFingerprint,confirmationEventId,claimDecision} from '../src/features/when-we-meet/confirmation-foundation.mjs';
const room={id:'11111111-1111-4111-8111-111111111111',startDate:'2026-11-01',endDate:'2026-11-02',startTime:'00:00',endTime:'24:00',timezone:'America/New_York'};
const members=[{userId:'22222222-2222-4222-8222-222222222222',email:'a@example.com'},{userId:'33333333-3333-4333-8333-333333333333',email:'b@example.com'}];
const input={roomId:room.id,date:'2026-11-01',start:'2026-11-01T06:00:00.000Z',end:'2026-11-01T07:00:00.000Z',recipients:members.map(m=>m.userId),revision:1,title:'Meeting'};
test('validates authoritative local range and membership',()=>{assert.equal(validateConfirmation(input,room,members).date,input.date); for(const patch of [{start:'2026-11-01T05:15:00.000Z'},{start:'2026-11-01T05:00:00+00:00'},{end:'2026-11-02T06:00:00.000Z'},{roomId:members[0].userId},{recipients:[members[0].userId,'44444444-4444-4444-8444-444444444444']},{recipients:[members[0].userId,members[0].userId]},{date:'2026-11-02'}])assert.throws(()=>validateConfirmation({...input,...patch},room,members));});
test('requires missing email to be explicitly excluded',()=>{const missing=[...members,{userId:'44444444-4444-4444-8444-444444444444',email:null}];assert.throws(()=>validateConfirmation(input,room,missing));assert.equal(validateConfirmation({...input,excluded:[missing[2].userId]},room,missing).recipients.length,2);assert.throws(()=>validateConfirmation({...input,excluded:[members[0].userId]},room,members));});
test('recipients and exclusions form a disjoint exhaustive membership partition',()=>{assert.throws(()=>validateConfirmation({...input,recipients:[members[0].userId],excluded:[members[0].userId]},room,members));assert.deepEqual(validateConfirmation({...input,recipients:[members[1].userId],excluded:[members[0].userId]},room,members).excluded,[members[0].userId]);});
test('rejects malformed or duplicate authoritative recipient addresses',()=>{for(const email of ['bad','a@@example.com','a@example.com\nBcc: x@y.com',' a b@example.com','a@example.com\u007f'])assert.throws(()=>validateConfirmation(input,room,[{...members[0],email},members[1]]));assert.throws(()=>validateConfirmation(input,room,[members[0],{...members[1],email:' A@EXAMPLE.COM '}]));assert.deepEqual(validateConfirmation(input,room,[{...members[0],email:' A@EXAMPLE.COM '},members[1]]).recipients[0].email,'A@EXAMPLE.COM');});
test('handles end24 and DST fold using UTC instants',()=>{assert.equal(validateConfirmation({...input,date:'2026-11-02',start:'2026-11-03T03:00:00.000Z',end:'2026-11-03T05:00:00.000Z'},room,members).end,'2026-11-03T05:00:00.000Z');assert.throws(()=>validateConfirmation({...input,start:'2026-11-01T05:30:00.000Z',end:'2026-11-01T06:30:00.000Z'},room,members));});
test('calendar payload never exposes guest addresses to guests',()=>{const valid=validateConfirmation(input,room,members),event=buildCalendarInsert(valid,'owner@example.com');assert.deepEqual(event.attendees,[{email:'a@example.com'},{email:'b@example.com'}]);assert.equal(event.guestsCanSeeOtherGuests,false);assert.equal(event.guestsCanInviteOthers,false);assert.equal(event.guestsCanModify,false);assert.equal(event.start.timeZone,room.timezone);assert.equal(event.end.dateTime,input.end);});
test('stable bounded event IDs and claims never authorize duplicate sends',()=>{const valid=validateConfirmation(input,room,members),hash=confirmationFingerprint(valid),id=confirmationEventId(room.id,1);assert.match(id,/^[0-9a-v]{5,1024}$/);assert.equal(confirmationEventId(room.id,1),id);assert.notEqual(confirmationEventId(room.id,2),id);assert.notEqual(confirmationFingerprint({...valid,title:'Other'}),hash);assert.equal(claimDecision(null,hash),'reserve');assert.equal(claimDecision({status:'pending',payloadHash:hash},hash),'reconcile');assert.equal(claimDecision({status:'failed',payloadHash:hash},hash),'reconcile');assert.equal(claimDecision({status:'confirmed',payloadHash:hash},hash),'existing');assert.equal(claimDecision({status:'pending',payloadHash:'other'},hash),'conflict');});
test('migration gates owner email resolver and durable reservations',()=>{const sql=readFileSync(new URL('../supabase/migrations/20260930000200_wwm_confirmation.sql',import.meta.url),'utf8');assert.match(sql,/auth\.users/);assert.match(sql,/owner_id\s*=\s*auth\.uid\(\)/);assert.match(sql,/room_id uuid primary key/i);assert.match(sql,/google_event_id text not null unique/i);assert.match(sql,/row level security/i);assert.doesNotMatch(sql,/grant\s+select\s+on\s+auth\.users/i);});
test('reservation and sanitized read RPCs enforce ownership and immutable claim',()=>{const sql=readFileSync(new URL('../supabase/migrations/20260930000200_wwm_confirmation.sql',import.meta.url),'utf8');assert.match(sql,/create function public\.wwm_reserve_confirmation\(/i);assert.match(sql,/create function public\.wwm_confirmation_status\(/i);assert.match(sql,/for update/i);assert.match(sql,/owner_id\s*=\s*auth\.uid\(\)/i);assert.match(sql,/payload_hash\s*=\s*p_payload_hash/i);assert.match(sql,/attendee_snapshot/i);assert.match(sql,/excluded_snapshot/i);assert.match(sql,/grant execute on function public\.wwm_reserve_confirmation\(/i);assert.doesNotMatch(sql,/grant\s+(?:insert|update|select)\s+on\s+public\.wwm_confirmations/i);assert.doesNotMatch(sql,/create function public\.wwm_(?:confirm|finalize)_confirmation\(/i);});
test('optional attendees are marked optional in the Google payload and change the fingerprint',()=>{
 const [a,b]=members.map(m=>m.userId);
 const required=validateConfirmation(input,room,members);
 const withOptional=validateConfirmation({...input,optional:[b]},room,members);
 assert.deepEqual(buildCalendarInsert(withOptional).attendees,[{email:'a@example.com'},{email:'b@example.com',optional:true}]);
 assert.deepEqual(buildCalendarInsert(required).attendees,[{email:'a@example.com'},{email:'b@example.com'}]);
 assert.notEqual(confirmationFingerprint(required),confirmationFingerprint(withOptional));
 assert.equal(withOptional.recipients.find(r=>r.userId===a).optional,false);
});
test('optional attendees must be recipients, without duplicates',()=>{
 const [a,b]=members.map(m=>m.userId);
 assert.throws(()=>validateConfirmation({...input,recipients:[a],excluded:[b],optional:[b]},room,members));
 assert.throws(()=>validateConfirmation({...input,optional:[a,a]},room,members));
 assert.throws(()=>validateConfirmation({...input,optional:'x'},room,members));
});
test('a renamed event title is trimmed and bounded',()=>{
 assert.equal(validateConfirmation({...input,title:'  Kickoff lunch  '},room,members).title,'Kickoff lunch');
 assert.throws(()=>validateConfirmation({...input,title:'x'.repeat(101)},room,members));
 assert.throws(()=>validateConfirmation({...input,title:'   '},room,members));
});
