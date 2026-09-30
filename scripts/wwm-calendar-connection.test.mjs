import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {createConnection,consumeConnection,readConnectionRoom,encodeFlowCookie,decodeFlowCookie,calendarReturnPath,encryptCredential,decryptCredential,safeRoomReturn,CALENDAR_SCOPE,validateCalendarGrant} from '../src/features/when-we-meet/calendar-connection.mjs';
const key=randomBytes(32).toString('base64url');
const room='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', user='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const start=(extra={})=>createConnection({roomId:room,userId:user,key,origin:'https://example.org',nonce:'browser-secret',clientId:'client-id',loginHint:'a@example.org',...extra});
test('authorization is a direct Google request with PKCE, offline consent and minimum scope',()=>{
 const flow=start();
 const url=new URL(flow.authorizationUrl);
 assert.equal(url.origin+url.pathname,'https://accounts.google.com/o/oauth2/v2/auth');
 assert.equal(url.searchParams.get('client_id'),'client-id');
 assert.equal(url.searchParams.get('scope'),`openid email ${CALENDAR_SCOPE}`);
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.equal(url.searchParams.get('redirect_uri'),'https://example.org/api/craft/when-we-meet/calendar/callback');
 assert.equal(url.searchParams.get('access_type'),'offline');
 assert.equal(url.searchParams.get('prompt'),'consent');
 assert.equal(url.searchParams.get('include_granted_scopes'),'true');
 assert.equal(url.searchParams.get('login_hint'),'a@example.org');
 assert.equal(url.searchParams.get('state'),flow.state);
 assert.ok(flow.verifier.length>=43);
 assert.ok(!flow.state.includes(flow.verifier));
 assert.ok(!flow.authorizationUrl.includes(flow.verifier));
});
test('state binds user, browser nonce and PKCE verifier and returns its room',()=>{
 const flow=start();
 const data=consumeConnection({state:flow.state,key,userId:user,nonce:'browser-secret',verifier:flow.verifier});
 assert.equal(data.roomId,room);
 assert.throws(()=>consumeConnection({state:flow.state,key,userId:user,nonce:'other',verifier:flow.verifier}));
 assert.throws(()=>consumeConnection({state:flow.state,key,userId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',nonce:'browser-secret',verifier:flow.verifier}));
 assert.throws(()=>consumeConnection({state:flow.state,key,userId:user,nonce:'browser-secret',verifier:randomBytes(32).toString('base64url')}));
 assert.throws(()=>consumeConnection({state:flow.state,key,userId:user,nonce:'browser-secret'}));
 assert.throws(()=>consumeConnection({state:flow.state,key:randomBytes(32).toString('base64url'),userId:user,nonce:'browser-secret',verifier:flow.verifier}));
});
test('state expiry, tampering and hostile return paths are rejected',()=>{
 const now=Date.now();const flow=start({now});
 const ok={key,userId:user,nonce:'browser-secret',verifier:flow.verifier};
 assert.throws(()=>consumeConnection({...ok,state:flow.state+'x',now}));
 assert.throws(()=>consumeConnection({...ok,state:flow.state,now:now+601000}));
 assert.throws(()=>consumeConnection({...ok,state:flow.state,now:now-1000}));
 assert.equal(safeRoomReturn(room,'https://evil.example/'),`/craft/when-we-meet/${room}`);
 assert.equal(safeRoomReturn(room,'//evil.example/'),`/craft/when-we-meet/${room}`);
 assert.throws(()=>createConnection({roomId:room,userId:user,key,origin:'http://evil.example',nonce:'n',clientId:'c'}));
 assert.throws(()=>createConnection({roomId:'not-a-room',userId:user,key,origin:'https://example.org',nonce:'n',clientId:'c'}));
});
test('return path is signed into state and only ever points at the room',()=>{
 const invite=`/craft/when-we-meet/${room}?invite=abc`;
 const flow=start({returnTo:invite});
 assert.equal(consumeConnection({state:flow.state,key,userId:user,nonce:'browser-secret',verifier:flow.verifier}).returnTo,invite);
 const hostile=start({returnTo:'https://evil.example/'});
 assert.equal(consumeConnection({state:hostile.state,key,userId:user,nonce:'browser-secret',verifier:hostile.verifier}).returnTo,`/craft/when-we-meet/${room}`);
});
test('the room is readable from a validly signed state only',()=>{
 const flow=start({returnTo:`/craft/when-we-meet/${room}?invite=abc`});
 assert.deepEqual(readConnectionRoom(flow.state,key),{roomId:room,returnTo:`/craft/when-we-meet/${room}?invite=abc`});
 assert.equal(readConnectionRoom(flow.state+'x',key),null);
 assert.equal(readConnectionRoom('garbage',key),null);
 assert.equal(readConnectionRoom(undefined,key),null);
});
test('flow cookie round-trips nonce, verifier and room and rejects junk',()=>{
 const value=encodeFlowCookie({nonce:'n'.repeat(43),verifier:'v'.repeat(43),roomId:room});
 assert.match(value,/^[\w-]+$/);
 assert.deepEqual(decodeFlowCookie(value),{nonce:'n'.repeat(43),verifier:'v'.repeat(43),roomId:room});
 assert.equal(decodeFlowCookie(undefined),null);
 assert.equal(decodeFlowCookie('not json'),null);
 assert.equal(decodeFlowCookie(Buffer.from(JSON.stringify({nonce:'n',verifier:'v',roomId:'../x'})).toString('base64url')),null);
});
test('return path carries only an outcome flag on the room path',()=>{
 assert.equal(calendarReturnPath(room,undefined,'connected'),`/craft/when-we-meet/${room}?calendar=connected`);
 assert.equal(calendarReturnPath(room,`/craft/when-we-meet/${room}?invite=abc&calendar=error`,'denied'),`/craft/when-we-meet/${room}?invite=abc&calendar=denied`);
 assert.equal(calendarReturnPath(room,'https://evil.example/','error'),`/craft/when-we-meet/${room}?calendar=error`);
 assert.equal(calendarReturnPath(null,undefined,'error'),'/craft/when-we-meet?calendar=error');
 assert.equal(calendarReturnPath(room,undefined,'bogus'),`/craft/when-we-meet/${room}?calendar=error`);
});
test('grant requires matching trusted Google subject and exact granted Calendar scope',()=>{
 const trusted={identities:[{provider:'google',id:'google-sub'}],email:'owner@example.org',email_confirmed_at:'2026-09-30'};
 const granted={sub:'google-sub',email:'owner@example.org',email_verified:true};
 assert.equal(validateCalendarGrant(trusted,granted,`openid email ${CALENDAR_SCOPE}`),true);
 assert.throws(()=>validateCalendarGrant(trusted,{...granted,sub:'other'},`openid email ${CALENDAR_SCOPE}`));
 assert.throws(()=>validateCalendarGrant(trusted,granted,'openid email'));
 assert.throws(()=>validateCalendarGrant(trusted,granted,`openid email ${CALENDAR_SCOPE}.readonly`));
 assert.throws(()=>validateCalendarGrant(trusted,{...granted,email_verified:false},`openid email ${CALENDAR_SCOPE}`));
 assert.throws(()=>validateCalendarGrant({...trusted,identities:[]},granted,`openid email ${CALENDAR_SCOPE}`));
});
test('credential encryption authenticates context and never contains plaintext',()=>{
 const token=encryptCredential({refresh_token:'top-secret'},key,`${user}:${room}`);
 assert.ok(!token.includes('top-secret'));
 assert.deepEqual(decryptCredential(token,key,`${user}:${room}`),{refresh_token:'top-secret'});
 assert.throws(()=>decryptCredential(token,key,`${user}:other`));
 assert.throws(()=>decryptCredential(token+'x',key,`${user}:${room}`));
});
