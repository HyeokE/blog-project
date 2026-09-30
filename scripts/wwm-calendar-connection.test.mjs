import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createConnection,consumeConnection,encryptCredential,decryptCredential,safeRoomReturn,CALENDAR_SCOPE,validateCalendarGrant} from '../src/features/when-we-meet/calendar-connection.mjs';
const key=randomBytes(32).toString('base64url');
const room='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
test('authorization binds room, user and browser nonce with PKCE and minimum scope',()=>{
 const flow=createConnection({roomId:room,userId:user,key,origin:'https://example.org',nonce:'browser-secret'});
 const url=new URL(flow.authorizationUrl);
 assert.equal(url.searchParams.get('scope'),`openid email ${CALENDAR_SCOPE}`);
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('redirect_uri'),'https://example.org/api/craft/when-we-meet/calendar/callback');
 assert.ok(flow.verifier.length>=43);
 assert.equal(consumeConnection({state:flow.state,key,roomId:room,userId:user,nonce:'browser-secret'}).challenge,url.searchParams.get('code_challenge'));
 assert.ok(!flow.state.includes(flow.verifier));
 assert.throws(()=>consumeConnection({state:flow.state,key,roomId:room,userId:user,nonce:'other'}));
 assert.throws(()=>consumeConnection({state:flow.state,key,roomId:room,userId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',nonce:'browser-secret'}));
});
test('state expiry, tampering and hostile return paths are rejected',()=>{
 const now=Date.now();const flow=createConnection({roomId:room,userId:user,key,origin:'https://example.org',nonce:'secret',now});
 assert.throws(()=>consumeConnection({state:flow.state+'x',key,roomId:room,userId:user,nonce:'secret',now}));
 assert.throws(()=>consumeConnection({state:flow.state,key,roomId:room,userId:user,nonce:'secret',now:now+601000}));
 assert.equal(safeRoomReturn(room,'https://evil.example/'),`/craft/when-we-meet/${room}`);
 assert.equal(safeRoomReturn(room,'//evil.example/'),`/craft/when-we-meet/${room}`);
});
test('grant requires matching trusted Google subject and exact granted Calendar scope',()=>{
 const trusted={identities:[{provider:'google',id:'google-sub'}],email:'owner@example.org',email_confirmed_at:'2026-09-30'};
 const granted={sub:'google-sub',email:'owner@example.org',email_verified:true};
 assert.equal(validateCalendarGrant(trusted,granted,`openid email ${CALENDAR_SCOPE}`),true);
 assert.throws(()=>validateCalendarGrant(trusted,{...granted,sub:'other'},`openid email ${CALENDAR_SCOPE}`));
 assert.throws(()=>validateCalendarGrant(trusted,granted,'openid email'));
 assert.throws(()=>validateCalendarGrant(trusted,{...granted,email_verified:false},`openid email ${CALENDAR_SCOPE}`));
});
test('credential encryption authenticates context and never contains plaintext',()=>{
 const token=encryptCredential({refresh_token:'top-secret'},key,`${user}:${room}`);
 assert.ok(!token.includes('top-secret'));
 assert.deepEqual(decryptCredential(token,key,`${user}:${room}`),{refresh_token:'top-secret'});
 assert.throws(()=>decryptCredential(token,key,`${user}:other`));
 assert.throws(()=>decryptCredential(token+'x',key,`${user}:${room}`));
});
