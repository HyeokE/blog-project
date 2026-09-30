import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeSlots} from '../src/features/when-we-meet/domain.mjs';
import {rsvpByMember,rsvpCounts} from '../src/features/when-we-meet/rsvp.mjs';
import {shortDay,confirmedWhen,confirmedChip,rsvpSummary,RSVP_LABELS} from '../src/features/when-we-meet/meeting-copy.mjs';
import {normalizeConfirmationResponse,confirmPanelState} from '../src/features/when-we-meet/confirm-tab.mjs';

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
 assert.match(route,/if\(metadata\.room\.ownerId!==session\.user\.id\)return ok\(\{confirmation,review:null\}\)/);
 assert.match(shared,/export async function ownerRsvp[\s\S]*catch\{return null\}/);
});
