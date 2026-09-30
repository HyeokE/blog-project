import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {calendarConfig,exchangeCalendarCode,fetchCalendarIdentity,calendarStatus} from '../src/features/when-we-meet/calendar-server.mjs';
const key=randomBytes(32).toString('base64url');
test('configuration requires exact registered HTTPS redirect and distinct keys',()=>{
 const env={GOOGLE_CALENDAR_CLIENT_ID:'client',GOOGLE_CALENDAR_CLIENT_SECRET:'secret',GOOGLE_CALENDAR_REDIRECT_URI:'https://example.org/api/craft/when-we-meet/calendar/callback',WWM_CALENDAR_ENCRYPTION_KEY:key,WWM_CALENDAR_STATE_KEY:key};
 assert.throws(()=>calendarConfig(env));
 assert.equal(calendarConfig({...env,WWM_CALENDAR_STATE_KEY:randomBytes(32).toString('base64url')}).origin,'https://example.org');
 assert.throws(()=>calendarConfig({...env,GOOGLE_CALENDAR_REDIRECT_URI:'https://evil.org/'}));
});
test('exchange uses PKCE and refuses missing refresh token or calendar scope',async()=>{
 let body;
 const config={clientId:'id',clientSecret:'secret',redirectUri:'https://example.org/callback'};
 const fetcher=async(_url,options)=>{body=new URLSearchParams(options.body);return {ok:true,json:async()=>({refresh_token:'refresh',scope:'https://www.googleapis.com/auth/calendar.events.owned',access_token:'access',expires_in:3600})}};
 const token=await exchangeCalendarCode('code','verifier',config,fetcher);
 assert.equal(body.get('code_verifier'),'verifier');assert.equal(token.refresh_token,'refresh');
 await assert.rejects(()=>exchangeCalendarCode('code','verifier',config,async()=>({ok:true,json:async()=>({access_token:'access'})})));
});
test('identity is read from Google using bearer access token',async()=>{
 const identity=await fetchCalendarIdentity('access',async(_url,options)=>{assert.equal(options.headers.Authorization,'Bearer access');return {ok:true,json:async()=>({sub:'subject',email:'a@example.org',email_verified:true})}});
 assert.equal(identity.sub,'subject');
});
test('status never exposes ciphertext or tokens',()=>{
 assert.deepEqual(calendarStatus({googleSubject:'subject',googleEmail:'a@example.org',credentialCiphertext:'secret'}),{connected:true,email:'a@example.org'});
 assert.deepEqual(calendarStatus(null),{connected:false,email:null});
});
