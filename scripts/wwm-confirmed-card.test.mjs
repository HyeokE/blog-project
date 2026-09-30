import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {rsvpByMember,rsvpCounts} from '../src/features/when-we-meet/rsvp.mjs';
import {shortDay,confirmedWhen,confirmedChip,rsvpSummary,RSVP_LABELS,memberInvitedLine} from '../src/features/when-we-meet/meeting-copy.mjs';
import {normalizeConfirmationResponse,confirmPanelState} from '../src/features/when-we-meet/confirm-tab.mjs';
import {normalizeRecipientFlag} from '../src/features/when-we-meet/normalize.mjs';

const A='11111111-1111-4111-8111-111111111111',B='33333333-3333-4333-8333-333333333333',C='44444444-4444-4444-8444-444444444444',D='55555555-5555-4555-8555-555555555555';
const members=[{userId:A,email:'Alex@Example.test'},{userId:B,email:'m@example.test'},{userId:C,email:'t@example.test'},{userId:D,email:null}];

test('RSVP: Google attendees map to members by case-insensitive email; output carries ids only',()=>{
 const event={attendees:[{email:'alex@example.test',responseStatus:'accepted',organizer:true},{email:' M@example.test ',responseStatus:'declined'},{email:'t@example.test',responseStatus:'tentative',optional:true},{email:'stranger@example.test',responseStatus:'accepted'}]};
 const rows=rsvpByMember(event,members);
 assert.deepEqual(rows,[{userId:A,response:'accepted'},{userId:B,response:'declined'},{userId:C,response:'tentative'}]);
 assert.equal(JSON.stringify(rows).includes('@'),false);
});

test('RSVP: unknown or missing statuses read as no reply; no event or no attendees gives null',()=>{
 assert.deepEqual(rsvpByMember({attendees:[{email:'m@example.test'},{email:'t@example.test',responseStatus:'weird'}]},members),[{userId:B,response:'needsAction'},{userId:C,response:'needsAction'}]);
 assert.equal(rsvpByMember(null,members),null);
 assert.equal(rsvpByMember({status:'cancelled',attendees:[]},members),null);
 assert.equal(rsvpByMember({},members),null);
});

test('RSVP counts and summary skip empty groups',()=>{
 const counts=rsvpCounts([{response:'accepted'},{response:'accepted'},{response:'declined'},{response:'needsAction'}]);
 assert.deepEqual(counts,{accepted:2,declined:1,tentative:0,needsAction:1});
 assert.equal(rsvpSummary(counts),'2 accepted · 1 declined · 1 no reply');
 assert.equal(rsvpSummary({accepted:0,declined:0,tentative:1,needsAction:0}),'1 maybe');
 assert.equal(rsvpSummary({accepted:0,declined:0,tentative:0,needsAction:0}),'');
 assert.deepEqual(RSVP_LABELS,{accepted:'Accepted',declined:'Declined',tentative:'Maybe',needsAction:'No reply'});
});

test('confirmed date copy: short weekday + month day, time range, timezone; header chip has no time',()=>{
 assert.equal(shortDay('2026-10-01'),'Thu, Oct 1');
 assert.equal(shortDay('2026-12-25'),'Fri, Dec 25');
 assert.equal(confirmedWhen({date:'2026-10-01',start:'10:00',end:'10:30',timezone:'Asia/Seoul'}),'Thu, Oct 1 · 10:00–10:30 · Asia/Seoul');
 assert.equal(confirmedChip({startsAt:'2026-10-01T01:00:00Z',endsAt:'2026-10-01T01:30:00Z',timezone:'Asia/Seoul'}),'Confirmed · Thu, Oct 1');
 // 23:30 UTC on 09.30 is already 10.01 in Seoul.
 assert.equal(confirmedChip({startsAt:'2026-09-30T23:30:00Z',endsAt:'2026-10-01T00:00:00Z',timezone:'Asia/Seoul'}),'Confirmed · Thu, Oct 1');
 assert.equal(confirmedChip(null),'');
});

const slots=makeSlots({title:'T',startDate:'2026-10-01',endDate:'2026-10-02',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul'});
const record={status:'confirmed',title:'Kickoff',startsAt:'2026-10-01T01:00:00.000Z',endsAt:'2026-10-01T01:30:00.000Z',timezone:'Asia/Seoul',googleEventUrl:'https://www.google.com/calendar/event?eid=1',revision:1};
const attendees=[{userId:A,name:'Alex',email:'a@example.test',hasAvailability:true,isOrganizer:true},{userId:B,name:'Morgan',email:'m@example.test',hasAvailability:true,isOrganizer:false},{userId:C,name:'Taylor',email:'t@example.test',hasAvailability:false,isOrganizer:false}];
const edit={revision:1,recipientIds:[A,B,C],excludedIds:[],optionalIds:[C],open:null,lastResentAt:null};

test('owner confirmed state lists recipients with Optional and RSVP; recipient count follows the snapshot',()=>{
 const data=normalizeConfirmationResponse({confirmation:record,review:{calendarConnected:true,organizerEmail:'a@example.test',attendees,edit,rsvp:[{userId:A,response:'accepted'},{userId:B,response:'declined'}]}});
 assert.deepEqual(data.review.rsvp,[{userId:A,response:'accepted'},{userId:B,response:'declined'}]);
 const state=confirmPanelState({data,slots});
 assert.equal(state.confirmation.recipientCount,3);
 assert.deepEqual(state.confirmation.attendees,[{id:A,name:'Alex',optional:false,rsvp:'accepted'},{id:B,name:'Morgan',optional:false,rsvp:'declined'},{id:C,name:'Taylor',optional:true,rsvp:'needsAction'}]);
 assert.equal(state.confirmation.rsvp,true);
});

test('without an RSVP read (no token) the attendee rows carry no status',()=>{
 const state=confirmPanelState({data:normalizeConfirmationResponse({confirmation:record,review:{calendarConnected:false,organizerEmail:null,attendees,edit,rsvp:null}}),slots});
 assert.equal(state.confirmation.rsvp,false);
 assert.equal(state.confirmation.attendees.every(row=>!('rsvp' in row)),true);
 assert.throws(()=>normalizeConfirmationResponse({confirmation:record,review:{calendarConnected:true,attendees,rsvp:[{userId:A,response:'maybe'}]}}));
});

test('members get no attendee list or count (other members stay private)',()=>{
 const state=confirmPanelState({data:normalizeConfirmationResponse({confirmation:record,review:null}),slots,organizerName:'Alex'});
 assert.equal(state.role,'member');
 assert.deepEqual(state.confirmation.attendees,[]);
 assert.equal(state.confirmation.recipientCount,undefined);
});

test('the owner GET adds RSVP from the owner token server-side and never fails on it',()=>{
 const route=readFileSync(new URL('../src/app/api/craft/when-we-meet/[roomId]/confirmation/route.ts',import.meta.url),'utf8');
 const shared=readFileSync(new URL('../src/app/api/craft/when-we-meet/[roomId]/confirmation/shared.ts',import.meta.url),'utf8');
 assert.match(route,/ownerRsvp\(/);
 assert.match(route,/if\(metadata\.room\.ownerId!==session\.user\.id\)return ok\(\{confirmation:confirmation\?\.status==='confirmed'\?\{\.\.\.confirmation,isRecipient:await recipientFlag\(session,roomId\)\}:confirmation,review:null\}\)/);
 assert.match(shared,/export async function ownerRsvp[\s\S]*catch\{return null\}/);
});

test('member recipient flag: true shows the event link, false hides it, unknown (RPC missing) hides it with neutral copy',()=>{
 const member=isRecipient=>confirmPanelState({data:normalizeConfirmationResponse({confirmation:isRecipient===undefined?record:{...record,isRecipient},review:null}),slots,organizerName:'Alex'}).confirmation;
 assert.equal(member(true).isRecipient,true);
 assert.equal(member(true).eventUrl,record.googleEventUrl);
 assert.equal(member(false).isRecipient,false);
 assert.equal(member(false).eventUrl,undefined);
 assert.equal(member(undefined).isRecipient,null);
 assert.equal(member(undefined).eventUrl,undefined);
 assert.equal(member('yes').isRecipient,null,'non-boolean flags read as unknown');
 // Owner view is unchanged: link kept, no member flag.
 const owner=confirmPanelState({data:normalizeConfirmationResponse({confirmation:{...record,isRecipient:false},review:{calendarConnected:true,organizerEmail:'a@example.test',attendees,edit,rsvp:null}}),slots}).confirmation;
 assert.equal(owner.eventUrl,record.googleEventUrl);
 assert.equal('isRecipient' in owner,false);
});

test('member invited line per recipient flag',()=>{
 assert.equal(memberInvitedLine(true,'Alex'),'You’re invited · Organized by Alex');
 assert.equal(memberInvitedLine(false,'Alex'),'Confirmed by Alex · You weren’t included in the invitation');
 assert.equal(memberInvitedLine(null,'Alex'),'Organized by Alex');
 assert.equal(memberInvitedLine(true,'Organizer'),'You’re invited');
 assert.equal(memberInvitedLine(false,undefined),'Confirmed by the organizer · You weren’t included in the invitation');
 assert.equal(memberInvitedLine(null,undefined),'Confirmed by the organizer');
});

test('normalizeRecipientFlag: only real booleans pass; missing RPC/null → unknown',()=>{
 assert.equal(normalizeRecipientFlag(true),true);
 assert.equal(normalizeRecipientFlag(false),false);
 for(const value of [null,undefined,'true',1,[true],{}])assert.equal(normalizeRecipientFlag(value),null);
 const shared=readFileSync(new URL('../src/app/api/craft/when-we-meet/[roomId]/confirmation/shared.ts',import.meta.url),'utf8');
 assert.match(shared,/rpc\('wwm_confirmation_is_recipient',\{p_room_id:roomId\}\);\s*return error\?null:normalizeRecipientFlag\(data\)/);
});

test('is_recipient migration: member-gated security definer boolean over the confirmed snapshot, no emails, authenticated only',()=>{
 const s=readFileSync(new URL('../supabase/migrations/20261001010000_wwm_confirmation_is_recipient.sql',import.meta.url),'utf8');
 assert.match(s,/create or replace function public\.wwm_confirmation_is_recipient\(p_room_id uuid\)\s*returns boolean language plpgsql stable security definer set search_path = ''/);
 assert.match(s,/auth\.uid\(\) is null or not wwm_private\.is_google\(\) or not wwm_private\.is_member\(p_room_id\)/);
 assert.match(s,/errcode='42501'/);
 assert.match(s,/from public\.wwm_confirmations c\s+where c\.room_id=p_room_id and c\.status='confirmed'/);
 assert.match(s,/jsonb_array_elements\(c\.attendee_snapshot\)/);
 assert.match(s,/\(a->>'userId'\)::uuid = auth\.uid\(\)/);
 assert.match(s,/coalesce\([\s\S]*,false\)/,'not confirmed → false');
 const body=s.replace(/^--.*$/gm,'');
 assert.doesNotMatch(body,/email/i,'never reads or returns addresses');
 assert.doesNotMatch(body,/wwm_confirmation_revisions/,'open edits are ignored until confirmed');
 assert.match(s,/revoke all on function public\.wwm_confirmation_is_recipient\(uuid\) from public,anon;/);
 assert.match(s,/grant execute on function public\.wwm_confirmation_is_recipient\(uuid\) to authenticated;/);
 assert.doesNotMatch(s,/grant [^;]* to (?:anon|public)/i);
 assert.match(s,/^begin;[\s\S]*commit;\s*$/m);
});
