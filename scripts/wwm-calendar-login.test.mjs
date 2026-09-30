import test from 'node:test';
import assert from 'node:assert/strict';
import {createServerClient} from '@supabase/ssr';
import * as login from '../src/features/when-we-meet/calendar-login.mjs';
const {createLoginExchange}=login;
const user={id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',email:'a@example.org',email_confirmed_at:'today',identities:[{provider:'google',id:'subject'}]};
const jwt=()=>{const payload=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600,sub:user.id})).toString('base64url');return `${Buffer.from('{}').toString('base64url')}.${payload}.c2lnbmF0dXJl`};
function fakeFetch(_url){const url=String(_url);if(url.includes('grant_type=pkce'))return Promise.resolve(new Response(JSON.stringify({access_token:jwt(),refresh_token:'supabase-refresh',provider_token:'provider-access-secret',provider_refresh_token:'provider-refresh-secret',token_type:'bearer',expires_in:3600,user}),{headers:{'content-type':'application/json'}}));if(url.endsWith('/user'))return Promise.resolve(new Response(JSON.stringify(user),{headers:{'content-type':'application/json'}}));throw Error(url)}
const makeClient=(sink)=>createServerClient('https://example.supabase.co','anon',{global:{fetch:fakeFetch},cookies:{getAll(){return [{name:'sb-example-auth-token-code-verifier',value:'verifier'}]},setAll(values){sink.push(...values)}}});
const decoded=cookies=>cookies.map(c=>c.value.startsWith('base64-')?Buffer.from(c.value.slice(7),'base64url').toString():c.value).join('');
test('plain login persists only the app session and never provider tokens',async()=>{
 const cookies=[],staged=[];
 const result=await createLoginExchange({client:makeClient(staged),createClient:()=>makeClient(cookies),code:'test-code'});
 assert.deepEqual(result,{authenticated:true});
 assert.ok(cookies.some(c=>c.name.includes('auth-token')&&c.value));
 assert.ok(!decoded(cookies).includes('provider-access-secret'));
 assert.ok(!decoded(cookies).includes('provider-refresh-secret'));
});
test('login has no Calendar side effects: no credential writer and no scope logic',()=>{
 assert.equal(login.validateCalendarGrant,undefined);
 assert.equal(createLoginExchange.length,1);
});
test('replayed authorization code cannot persist app state',async()=>{
 let exchanges=0;const cookies=[];
 const client={auth:{exchangeCodeForSession:async()=>{exchanges++;return {error:exchanges>1?Error('already used'):null,data:exchanges>1?null:{session:{access_token:jwt(),refresh_token:'supabase-refresh'},user}}}}};
 const run=()=>createLoginExchange({client,createClient:()=>makeClient(cookies),code:'replayed'});
 await run();const before=cookies.length;
 await assert.rejects(run);assert.equal(cookies.length,before);
});
