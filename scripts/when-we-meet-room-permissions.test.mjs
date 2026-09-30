import test from 'node:test';
import assert from 'node:assert/strict';
import {roomForViewer} from '../src/features/when-we-meet/room-permissions.mjs';
const room={id:'meeting',owner_id:'owner',invite_token:'test-only-token'};
test('meeting owner receives ADMIN while preserving the share link',()=>{const result=roomForViewer(room,'owner');assert.equal(result.role,'ADMIN');assert.equal(result.invite_token,room.invite_token)});
test('ordinary members can share the same link without ADMIN authority',()=>{const result=roomForViewer(room,'member');assert.equal(result.role,'MEMBER');assert.equal(result.invite_token,room.invite_token)});
test('missing ownership cannot grant ADMIN',()=>{assert.equal(roomForViewer({id:'meeting'},undefined).role,'MEMBER')});
