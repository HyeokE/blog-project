import {dataBoundaryLeaks} from './wwm-data-boundary.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRoom,normalizeMeeting,normalizeResponses,normalizePeople,normalizeAttendees,normalizeConfirmation,normalizeCreatedRoom,normalizeCredential,participantCountsByRoom,confirmationStatusByRoom} from '../src/features/when-we-meet/normalize.mjs';

const SNAKE=/^[a-z]+(?:_[a-z]+)+$/;
const keysDeep=value=>value&&typeof value==='object'?Object.entries(value).flatMap(([key,child])=>[key,...keysDeep(child)]):[];
const assertCamel=value=>assert.deepEqual(keysDeep(value).filter(key=>SNAKE.test(key)),[],'no snake_case key may cross the data-access boundary');

const roomRow={id:'r',owner_id:'o',title:'Meet',start_date:'2026-10-01',end_date:'2026-10-02',start_time:'09:00:00',end_time:'24:00:00',timezone:'Asia/Seoul',invite_token:'t'};

test('room rows become camelCase with HH:mm clocks',()=>{
 const room=normalizeRoom(roomRow);
 assert.deepEqual(room,{id:'r',ownerId:'o',title:'Meet',startDate:'2026-10-01',endDate:'2026-10-02',startTime:'09:00',endTime:'24:00',timezone:'Asia/Seoul',inviteToken:'t'});
 assertCamel(room);
 const partial=normalizeRoom({id:'r',title:'Meet',start_date:'2026-10-01',end_date:'2026-10-01',start_time:'09:00',end_time:'10:00',timezone:'UTC'});
 assert.equal('ownerId' in partial,false);assert.equal('inviteToken' in partial,false);
});

test('meeting rows carry createdAt and participantCount',()=>{
 const counts=participantCountsByRoom([{room_id:'r',participant_count:'3'}]);
 assert.equal(counts.get('r'),3);
 const meeting=normalizeMeeting({...roomRow,created_at:'2026-09-29T00:00:00Z'},counts);
 assert.equal(meeting.createdAt,'2026-09-29T00:00:00Z');assert.equal(meeting.participantCount,3);assert.equal(meeting.startTime,'09:00');
 assert.equal(normalizeMeeting({...roomRow,id:'x',created_at:'z'},counts).participantCount,null);
 assertCamel(meeting);
});

test('meeting rows carry the confirmation status from wwm_confirmation_status rows (null when unknown)',()=>{
 const statuses=confirmationStatusByRoom([['r',[{revision:1,status:'confirmed',title:'Meet',starts_at:'x',ends_at:'y',timezone:'UTC',google_event_url:null}]],['n',[]],['e',null]]);
 assert.equal(statuses.get('r'),'confirmed');assert.equal(statuses.get('n'),null);assert.equal(statuses.has('e'),false);
 const meeting=normalizeMeeting({...roomRow,created_at:'z'},new Map(),statuses);
 assert.equal(meeting.confirmationStatus,'confirmed');
 assert.equal(normalizeMeeting({...roomRow,id:'n',created_at:'z'},new Map(),statuses).confirmationStatus,null);
 assert.equal(normalizeMeeting({...roomRow,id:'q',created_at:'z'}).confirmationStatus,null);
 assertCamel(meeting);
});

test('response rows become camelCase with canonical ISO slots and the raw version string',()=>{
 const [row]=normalizeResponses([{user_id:'u',display_name:'A',slots:['2026-10-01T00:00:00+00:00'],updated_at:'2026-09-30 01:02:03.456789+00'}]);
 assert.deepEqual(row,{userId:'u',displayName:'A',slots:['2026-10-01T00:00:00.000Z'],updatedAt:'2026-09-30 01:02:03.456789+00'});
 assert.equal('updatedAt' in normalizeResponses([{user_id:'u',display_name:'A',slots:null}])[0],false);
 assert.deepEqual(normalizeResponses([{user_id:'u',display_name:'A',slots:null}])[0].slots,[]);
});

test('people and attendee RPC rows become camelCase',()=>{
 assert.deepEqual(normalizePeople([{user_id:'u',display_name:'A',is_admin:true,has_availability:false}]),[{userId:'u',displayName:'A',isAdmin:true,hasAvailability:false}]);
 assert.deepEqual(normalizeAttendees([{user_id:'u',display_name:'A',email:null,has_availability:true}]),[{userId:'u',displayName:'A',email:null,hasAvailability:true}]);
});

test('confirmation status, created room and credential rows become camelCase',()=>{
 assert.equal(normalizeConfirmation(null),null);
 const record=normalizeConfirmation({revision:1,status:'confirmed',title:'T',starts_at:'2026-10-01T00:00:00.000Z',ends_at:'2026-10-01T01:00:00.000Z',timezone:'UTC',google_event_url:null});
 assert.deepEqual(record,{status:'confirmed',title:'T',startsAt:'2026-10-01T00:00:00.000Z',endsAt:'2026-10-01T01:00:00.000Z',timezone:'UTC',googleEventUrl:null,revision:1});
 assert.deepEqual(normalizeCreatedRoom({id:'r',invite_token:'t'}),{id:'r',inviteToken:'t'});
 assert.equal(normalizeCredential(undefined),null);
 assert.deepEqual(normalizeCredential({google_subject:'s',google_email:'e@example.org',credential_ciphertext:'c'}),{googleSubject:'s',googleEmail:'e@example.org',credentialCiphertext:'c'});
});

test('snake_case columns appear above the data-access layer only inside SQL-facing query builders',async()=>{
 const {readdirSync,readFileSync,statSync}=await import('node:fs');
 const root=new URL('../',import.meta.url);
 const walk=dir=>readdirSync(new URL(dir,root)).flatMap(name=>{const path=`${dir}/${name}`;return statSync(new URL(path,root)).isDirectory()?walk(path):/\.(m?[jt]sx?|d\.m?ts)$/.test(name)?[path]:[]});
 const files=['src/features','src/app/craft','src/app/api/craft','src/components','src/stories','src/lib'].flatMap(walk);
 const leaks=files.flatMap(path=>dataBoundaryLeaks(path,readFileSync(new URL(path,root),'utf8')));
 assert.deepEqual(leaks,[]);
});
