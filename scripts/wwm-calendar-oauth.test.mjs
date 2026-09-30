import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createConnection,encodeFlowCookie,decryptCredential,CALENDAR_SCOPE} from '../src/features/when-we-meet/calendar-connection.mjs';
import {calendarConfig,completeCalendarConnection} from '../src/features/when-we-meet/calendar-server.mjs';
const src=new URL('../src/',import.meta.url);
const read=path=>readFile(new URL(path,src),'utf8');
const room='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const user={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',email:'a@example.org',email_confirmed_at:'today',identities:[{provider:'google',id:'google-sub'}]};
const config=calendarConfig('https://example.org',{GOOGLE_CALENDAR_CLIENT_ID:'client',GOOGLE_CALENDAR_CLIENT_SECRET:'secret',WWM_CALENDAR_ENCRYPTION_KEY:randomBytes(32).toString('base64url'),WWM_CALENDAR_STATE_KEY:randomBytes(32).toString('base64url')});
function begin({returnTo}={}){
 const nonce=randomBytes(32).toString('base64url');
 const flow=createConnection({roomId:room,userId:user.id,key:config.stateKey,origin:config.origin,nonce,clientId:config.clientId,loginHint:user.email,returnTo});
 return {state:flow.state,cookie:encodeFlowCookie({nonce,verifier:flow.verifier,roomId:room}),verifier:flow.verifier};
}
function google({scope=`openid email ${CALENDAR_SCOPE}`,sub='google-sub',refresh='google-refresh'}={}){
 const calls=[];
 const fetcher=async(url,options)=>{calls.push({url:String(url),options});
  if(String(url).startsWith('https://oauth2.googleapis.com/token'))return {ok:true,json:async()=>({access_token:'google-access',refresh_token:refresh,scope,expires_in:3600})};
  if(String(url).startsWith('https://openidconnect.googleapis.com/v1/userinfo'))return {ok:true,json:async()=>({sub,email:'a@example.org',email_verified:true})};
  throw Error(`unexpected ${url}`);};
 return {fetcher,calls};
}
const run=async({params,cookie,signedIn=user,fetcher,returnTo}={})=>{
 const flow=begin({returnTo});const writes=[];
 const query=new URLSearchParams(params??{code:'4/0Aauthorization-code',state:flow.state,scope:`openid email ${CALENDAR_SCOPE}`});
 const result=await completeCalendarConnection({params:query,cookie:cookie===undefined?flow.cookie:cookie,user:signedIn,config,fetcher:fetcher??google().fetcher,store:async(...args)=>{writes.push(args)}});
 return {result,writes,flow};
};
test('a valid callback exchanges with the PKCE verifier and stores the credential under the existing AAD',async()=>{
 const {fetcher,calls}=google();
 const {result,writes,flow}=await run({fetcher});
 assert.deepEqual(result,{outcome:'connected',location:`/craft/when-we-meet/${room}?calendar=connected`});
 const exchange=new URLSearchParams(calls[0].options.body);
 assert.equal(exchange.get('code_verifier'),flow.verifier);
 assert.equal(exchange.get('redirect_uri'),'https://example.org/api/craft/when-we-meet/calendar/callback');
 assert.equal(writes.length,1);
 const [userId,subject,email,cipher]=writes[0];
 assert.deepEqual([userId,subject,email],[user.id,'google-sub','a@example.org']);
 assert.ok(!cipher.includes('google-refresh'));
 assert.deepEqual(decryptCredential(cipher,config.encryptionKey,`credential:${user.id}:google-sub`),{refresh_token:'google-refresh'});
});
test('the signed return path (e.g. invite query) is kept and only the outcome flag is added',async()=>{
 const {result}=await run({returnTo:`/craft/when-we-meet/${room}?invite=abc`});
 assert.equal(result.location,`/craft/when-we-meet/${room}?invite=abc&calendar=connected`);
});
test('user-denied consent returns to the room without any Google call or write',async()=>{
 const {fetcher,calls}=google();const flow=begin();
 const result=await completeCalendarConnection({params:new URLSearchParams({error:'access_denied',state:flow.state}),cookie:flow.cookie,user,config,fetcher,store:async()=>{throw Error('must not store')}});
 assert.deepEqual(result,{outcome:'denied',location:`/craft/when-we-meet/${room}?calendar=denied`});
 assert.equal(calls.length,0);
});
test('a different signed-in user, missing cookie, tampered state or wrong nonce never reach Google',async()=>{
 const other={...user,id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
 const forged=begin();
 for(const scenario of [{signedIn:other},{signedIn:null},{cookie:null},{cookie:'garbage'},{cookie:forged.cookie}]){
  const {fetcher,calls}=google();
  const {result,writes}=await run({...scenario,fetcher});
  assert.equal(result.outcome,'error');assert.equal(calls.length,0);assert.equal(writes.length,0);
  assert.equal(result.location,`/craft/when-we-meet/${room}?calendar=error`);
 }
 const flow=begin();const {fetcher,calls}=google();
 const result=await completeCalendarConnection({params:new URLSearchParams({code:'4/0Acode-value',state:flow.state.slice(0,-2)+'xx'}),cookie:flow.cookie,user,config,fetcher,store:async()=>{throw Error('no')}});
 assert.equal(result.outcome,'error');assert.equal(calls.length,0);
});
test('a Google account other than the linked identity, or a grant without Calendar scope, is never stored',async()=>{
 for(const answer of [{sub:'attacker'},{scope:'openid email'}]){
  const {result,writes}=await run({fetcher:google(answer).fetcher});
  assert.equal(result.outcome,'error');assert.equal(writes.length,0);
 }
});
test('a malformed or missing code is rejected before the token exchange',async()=>{
 const flow=begin();
 for(const code of [undefined,'','x','a b c d e f g h']){
  const {fetcher,calls}=google();const params=new URLSearchParams({state:flow.state});if(code!==undefined)params.set('code',code);
  const result=await completeCalendarConnection({params,cookie:flow.cookie,user,config,fetcher,store:async()=>{}});
  assert.equal(result.outcome,'error');assert.equal(calls.length,0);
 }
});

test('ordinary Google sign-in requests only default scopes and never forces offline consent',async()=>{
 const route=await read('app/api/craft/auth/google/route.ts');
 assert.match(route,/signInWithOAuth\(/);
 assert.doesNotMatch(route,/scopes\s*:/);
 assert.match(route,/signInWithOAuth\(\{provider:'google',options:\{redirectTo:callback\.toString\(\)\}\}\)/);
 assert.doesNotMatch(route,/googleapis\.com\/auth/);
 assert.doesNotMatch(route,/access_type|prompt\s*:/);
});
test('the login callback never reads, writes or deletes a Calendar credential',async()=>{
 const route=await read('app/api/craft/auth/callback/route.ts');
 assert.doesNotMatch(route,/storeCredential|encryptCredential|calendar-server|calendar-db|provider_refresh_token/);
 assert.match(route,/createLoginExchange\(/);
});
test('connect route is same-origin, member-only, origin-derived and sets a path-scoped httpOnly flow cookie',async()=>{
 const route=await read('app/api/craft/when-we-meet/[roomId]/calendar/connect/route.ts');
 assert.match(route,/if\(!sameOrigin\(request\)\)return failed\('Invalid request origin\.',403\)/);
 assert.match(route,/craftRoomMetadata\(roomId,session\)/);
 assert.match(route,/requestOrigin\(request\.headers\)/);
 assert.match(route,/calendarConfig\(origin\)/);
 assert.match(route,/createConnection\(/);
 assert.match(route,/httpOnly:true/);assert.match(route,/sameSite:'lax'/);assert.match(route,/path:CALENDAR_CALLBACK_PATH/);assert.match(route,/maxAge:600/);
 assert.match(route,/secure:origin\.startsWith\('https:'\)/);
 assert.doesNotMatch(route,/console\.(log|warn|error)\([^)]*(verifier|nonce|state)/);
});
test('callback route clears the flow cookie, uses the signed-in user and redirects without auto-applying anything',async()=>{
 const route=await read('app/api/craft/when-we-meet/calendar/callback/route.ts');
 assert.match(route,/export async function GET/);
 assert.doesNotMatch(route,/status:410/);
 assert.match(route,/currentSupabaseUser\(\)/);
 assert.match(route,/completeCalendarConnection\(/);
 assert.match(route,/storeCredential/);
 assert.match(route,/maxAge:0/);
 assert.match(route,/status:303/);
 assert.doesNotMatch(route,/listEventBusy|postConfirmation|createCalendarEvent/);
});
test('Calendar reconnect buttons use the direct Calendar consent flow, not sign-in',async()=>{
 const api=await read('features/when-we-meet/api.ts');
 assert.match(api,/export async function connectGoogleCalendar\(roomId:string,returnTo:string\)/);
 const room=await read('features/when-we-meet/WhenWeMeet.tsx');
 assert.match(room,/onReconnect=\{\(\)=>void connectGoogleCalendar\(/);
 const tab=await read('features/when-we-meet/ConfirmTab.tsx');
 assert.match(tab,/connectGoogleCalendar\(roomId,/);
 assert.doesNotMatch(tab,/signInWithGoogle/);
});
test('the room announces the consent outcome once and treats unknown flags as nothing',async()=>{
 const {calendarReturnNotice}=await import('../src/features/when-we-meet/calendar-fill.mjs');
 assert.equal(calendarReturnNotice('connected').tone,'success');
 assert.match(calendarReturnNotice('connected').text,/Fill from Google Calendar/);
 assert.equal(calendarReturnNotice('denied').tone,'info');
 assert.equal(calendarReturnNotice('error').tone,'error');
 assert.equal(calendarReturnNotice(null),null);assert.equal(calendarReturnNotice('<script>'),null);
 const room=await read('features/when-we-meet/WhenWeMeet.tsx');
 assert.match(room,/calendarReturnNotice\(/);assert.match(room,/searchParams\.delete\('calendar'\)/);assert.match(room,/history\.replaceState/);
});
