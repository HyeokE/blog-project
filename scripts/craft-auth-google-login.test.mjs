import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {
 googleOAuthClient,loginConfig,isLoginOrigin,createLoginFlow,readLoginCallback,loginReturnPath,exchangeLoginCode,
 LOGIN_CALLBACK_PATH,LOGIN_FLOW_COOKIE
} from '../src/lib/google-login.mjs';
import {createConnection} from '../src/features/when-we-meet/calendar-connection.mjs';
const src=new URL('../src/',import.meta.url);
const read=path=>readFile(new URL(path,src),'utf8');
const key=randomBytes(32).toString('base64url');
const env={GOOGLE_OAUTH_CLIENT_ID:'client.apps.googleusercontent.com',GOOGLE_OAUTH_CLIENT_SECRET:'secret',WWM_CALENDAR_STATE_KEY:key};
const origin='https://hyeok.dev';
const config=loginConfig(origin,env);
const hex=value=>createHash('sha256').update(value).digest('hex');
const b64sha=value=>createHash('sha256').update(value).digest('base64url');
function begin(next='/craft/when-we-meet',now=Date.now()){
 const flow=createLoginFlow({config,next,now});
 const url=new URL(flow.authorizationUrl);
 return {...flow,url,state:url.searchParams.get('state')};
}
const params=values=>new URLSearchParams(values);

test('unified client config reads only GOOGLE_OAUTH_* and the state key',()=>{
 assert.deepEqual(googleOAuthClient(env),{clientId:env.GOOGLE_OAUTH_CLIENT_ID,clientSecret:'secret'});
 assert.throws(()=>googleOAuthClient({GOOGLE_CALENDAR_CLIENT_ID:'old',GOOGLE_CALENDAR_CLIENT_SECRET:'old'}));
 assert.throws(()=>loginConfig(origin,{...env,WWM_CALENDAR_STATE_KEY:'short'}));
 assert.equal(config.redirectUri,`https://hyeok.dev${LOGIN_CALLBACK_PATH}`);
 assert.equal(LOGIN_CALLBACK_PATH,'/api/craft/auth/google/callback');
});
test('only origins registered on the OAuth client may sign in (Vercel previews are refused)',()=>{
 for(const ok of ['https://hyeok.dev','https://macmini-home.taile6a871.ts.net:8446','http://localhost:3002'])assert.equal(isLoginOrigin(ok),true,ok);
 for(const bad of ['https://blog-project-git-x.vercel.app','http://127.0.0.1:3002','https://evil.example',null,undefined])assert.equal(isLoginOrigin(bad),false,String(bad));
 assert.throws(()=>loginConfig('https://blog-project-abc.vercel.app',env),/registered/);
});
test('authorization URL: code flow, PKCE S256, hashed nonce, select_account, default scopes only',()=>{
 const flow=begin();const p=flow.url.searchParams;
 assert.equal(flow.url.origin+flow.url.pathname,'https://accounts.google.com/o/oauth2/v2/auth');
 assert.equal(p.get('client_id'),env.GOOGLE_OAUTH_CLIENT_ID);
 assert.equal(p.get('redirect_uri'),'https://hyeok.dev/api/craft/auth/google/callback');
 assert.equal(p.get('response_type'),'code');
 assert.equal(p.get('scope'),'openid email profile');
 assert.equal(p.get('code_challenge_method'),'S256');
 assert.equal(p.get('code_challenge'),b64sha(flow.flow.verifier));
 assert.equal(p.get('nonce'),hex(flow.flow.nonce),'Google receives sha256(rawNonce) hex; Supabase gets the raw nonce');
 assert.notEqual(p.get('nonce'),flow.flow.nonce);
 assert.equal(p.get('prompt'),'select_account');
 assert.equal(p.has('access_type'),false);assert.equal(p.has('include_granted_scopes'),false);assert.equal(p.has('login_hint'),false);
 assert.equal(flow.flow.next,'/craft/when-we-meet');
});
test('login_hint is optional and must look like an email; next is sanitised',()=>{
 assert.equal(new URL(createLoginFlow({config,next:'/craft/when-we-meet',loginHint:'a@example.org'}).authorizationUrl).searchParams.get('login_hint'),'a@example.org');
 assert.equal(new URL(createLoginFlow({config,next:'/craft/when-we-meet',loginHint:'not an email'}).authorizationUrl).searchParams.has('login_hint'),false);
 assert.equal(createLoginFlow({config,next:'https://evil.example/'}).flow.next,'/craft/when-we-meet');
 const invite='/craft/when-we-meet/03e3c543-4288-4f44-b7c3-fcc7ca9dc49d?invite=abc';
 assert.equal(createLoginFlow({config,next:invite}).flow.next,invite);
});
test('flow cookie round-trips and rejects tampering',()=>{
 const flow=begin();
 const decision=readLoginCallback({params:params({state:flow.state,code:'4/0AbCdEf-gh_ij'}),cookie:flow.cookie,key});
 assert.deepEqual(decision,{outcome:'exchange',code:'4/0AbCdEf-gh_ij',verifier:flow.flow.verifier,nonce:flow.flow.nonce,next:'/craft/when-we-meet'});
 for(const cookie of [undefined,'','x'.repeat(5000),'bm90LWpzb24',Buffer.from(JSON.stringify({verifier:'short',nonce:'n',next:'/'})).toString('base64url')]){
  assert.equal(readLoginCallback({params:params({state:flow.state,code:'4/0AbCdEf'}),cookie,key}).outcome,'expired');
 }
});
test('callback decisions: denied, provider error, bad state, wrong browser, expiry, bad code',()=>{
 const flow=begin('/craft/when-we-meet/03e3c543-4288-4f44-b7c3-fcc7ca9dc49d?invite=tok');
 const next='/craft/when-we-meet/03e3c543-4288-4f44-b7c3-fcc7ca9dc49d?invite=tok';
 assert.deepEqual(readLoginCallback({params:params({error:'access_denied',state:flow.state}),cookie:flow.cookie,key}),{outcome:'denied',next});
 assert.deepEqual(readLoginCallback({params:params({error:'server_error'}),cookie:flow.cookie,key}),{outcome:'failed',next});
 assert.deepEqual(readLoginCallback({params:params({error:'access_denied'}),cookie:undefined,key}),{outcome:'denied',next:'/craft/when-we-meet'});
 const [payload,signature]=flow.state.split('.');
 for(const state of [undefined,'',`${payload}.${signature.slice(0,-2)}aa`,`${payload}x.${signature}`,`${payload}.${signature}.extra`]){
  assert.equal(readLoginCallback({params:params({...(state!==undefined?{state}:{}),code:'4/0AbCdEf'}),cookie:flow.cookie,key}).outcome,'failed',String(state));
 }
 const other=begin();
 assert.equal(readLoginCallback({params:params({state:other.state,code:'4/0AbCdEf'}),cookie:flow.cookie,key}).outcome,'failed','state from another browser flow');
 assert.equal(readLoginCallback({params:params({state:flow.state,code:'4/0AbCdEf'}),cookie:flow.cookie,key:randomBytes(32).toString('base64url')}).outcome,'failed');
 assert.equal(readLoginCallback({params:params({state:flow.state,code:'4/0AbCdEf'}),cookie:flow.cookie,key,now:Date.now()+601000}).outcome,'expired');
 assert.equal(readLoginCallback({params:params({state:flow.state,code:'4/0AbCdEf'}),cookie:flow.cookie,key,now:Date.now()-60000}).outcome,'failed');
 for(const code of [undefined,'','short','a b c d e f']){
  assert.equal(readLoginCallback({params:params({state:flow.state,...(code!==undefined?{code}:{})}),cookie:flow.cookie,key}).outcome,'failed',String(code));
 }
});
test('a Calendar consent state cannot be replayed as a sign-in state (domain-separated MAC)',()=>{
 const flow=begin();
 const calendar=createConnection({roomId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',userId:'u',key,origin,nonce:'n'.repeat(30),clientId:'c'});
 assert.equal(readLoginCallback({params:params({state:calendar.state,code:'4/0AbCdEf'}),cookie:flow.cookie,key}).outcome,'failed');
});
test('return path targets the client page with signedIn=1 or a known error code',()=>{
 assert.equal(loginReturnPath('/craft/when-we-meet','signedIn'),'/craft/when-we-meet/auth/callback?next=%2Fcraft%2Fwhen-we-meet&signedIn=1');
 assert.equal(loginReturnPath('/craft/when-we-meet/03e3c543-4288-4f44-b7c3-fcc7ca9dc49d?invite=a','denied'),'/craft/when-we-meet/auth/callback?next=%2Fcraft%2Fwhen-we-meet%2F03e3c543-4288-4f44-b7c3-fcc7ca9dc49d%3Finvite%3Da&error=denied');
 assert.equal(loginReturnPath('//evil.example','weird'),'/craft/when-we-meet/auth/callback?next=%2Fcraft%2Fwhen-we-meet&error=failed');
 assert.match(loginReturnPath(undefined,'unavailable'),/error=unavailable$/);
});
test('code exchange posts PKCE + secret to Google and returns only the ID/access tokens',async()=>{
 const calls=[];
 const fetcher=async(url,options)=>{calls.push({url:String(url),body:new URLSearchParams(options.body)});return {ok:true,json:async()=>({id_token:'header.payload.sig',access_token:'ya29.x',refresh_token:'never-kept',scope:'openid email profile'})}};
 const tokens=await exchangeLoginCode('4/0AbCdEf','verifier-value',config,fetcher);
 assert.deepEqual(tokens,{idToken:'header.payload.sig',accessToken:'ya29.x'});
 assert.equal(calls[0].url,'https://oauth2.googleapis.com/token');
 const body=Object.fromEntries(calls[0].body);
 assert.deepEqual(body,{grant_type:'authorization_code',code:'4/0AbCdEf',code_verifier:'verifier-value',client_id:env.GOOGLE_OAUTH_CLIENT_ID,client_secret:'secret',redirect_uri:'https://hyeok.dev/api/craft/auth/google/callback'});
 await assert.rejects(exchangeLoginCode('4/0AbCdEf','v',config,async()=>({ok:false,json:async()=>({error:'invalid_grant'})})));
 await assert.rejects(exchangeLoginCode('4/0AbCdEf','v',config,async()=>({ok:true,json:async()=>({access_token:'x'})})));
});
test('sign-in routes: own-domain Google flow, path-scoped flow cookie, signInWithIdToken on the writable client',async()=>{
 const start=await read('app/api/craft/auth/google/route.ts');
 assert.doesNotMatch(start,/signInWithOAuth/);
 assert.match(start,/createLoginFlow\(/);
 assert.match(start,/httpOnly:true/);assert.match(start,/sameSite:'lax'/);assert.match(start,/path:LOGIN_CALLBACK_PATH/);assert.match(start,/maxAge:LOGIN_FLOW_TTL_SECONDS/);
 assert.match(start,/secure:origin\.startsWith\('https:'\)/);
 assert.match(start,/status:303/);
 const callback=await read('app/api/craft/auth/google/callback/route.ts');
 assert.match(callback,/readLoginCallback\(/);
 assert.match(callback,/serverSupabaseClient\(\)/);
 assert.match(callback,/signInWithIdToken\(\{provider:'google',token:tokens\.idToken,access_token:tokens\.accessToken,nonce:decision\.nonce\}\)/);
 assert.match(callback,/LOGIN_FLOW_COOKIE,'',\{[^}]*maxAge:0/);
 assert.doesNotMatch(callback,/storeCredential|encryptCredential|calendar-db|refresh_token/);
 assert.doesNotMatch(`${start}\n${callback}`,/console\.(log|warn|error)\([^)]*(verifier|nonce|code|token)\b/);
 assert.equal(LOGIN_FLOW_COOKIE,'craft_google_login');
});
test('client callback page no longer exchanges codes; obsolete exchange route is gone',async()=>{
 const page=await read('app/craft/when-we-meet/auth/callback/page.tsx');
 assert.doesNotMatch(page,/\/api\/craft\/auth\/callback|exchangeCodeForSession|params\.get\('code'\)/);
 assert.match(page,/signedIn/);
 assert.match(page,/completeCreateReturn\(/);assert.match(page,/restoreInviteReturn\(/);
 assert.match(page,/location\.replace\(destination\)/);
 await assert.rejects(read('app/api/craft/auth/callback/route.ts'));
 await assert.rejects(read('features/when-we-meet/calendar-login.mjs'));
});
