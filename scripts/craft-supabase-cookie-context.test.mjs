import test from 'node:test';
import * as requestOriginModule from '../src/lib/request-origin.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const server=readFileSync(new URL('../src/lib/supabase/server.ts',import.meta.url),'utf8');
const proxy=readFileSync(new URL('../src/proxy.ts',import.meta.url),'utf8');
const callback=readFileSync(new URL('../src/app/api/craft/auth/google/callback/route.ts',import.meta.url),'utf8');
test('RSC user lookup selects a read-only cookie adapter, not an unconditional store.set',()=>{
 assert.match(server,/serverSupabaseClient\(\{readOnly:true\}\)/);
 assert.match(server,/if\(!readOnly\).*store\.set/s);
 assert.doesNotMatch(server,/catch\s*\{\s*\/\/.*Server Component/s);
});
test('existing proxy refreshes and propagates cookies to request and response',()=>{
 assert.match(proxy,/request\.cookies\.set\(name,value\)/);
 assert.match(proxy,/response\.cookies\.set\(name,value/);
 assert.match(proxy,/await client\.auth\.getUser\(\)/);
 assert.match(proxy,/pathname\.startsWith\('\/api\/craft'\)/);
});
test('proxy sets Secure for approved Tailnet host even if upstream request URL is HTTP',async()=>{
 const compiled=ts.transpileModule(proxy,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const outputs=[];
 class NextResponse {static next(){const response={cookies:{set(_name,_value,options){outputs.push(options)}},headers:{set(){}}};return response}}
 const exports={};
 runInNewContext(compiled,{exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'public'}},require(id){if(id==='@/lib/request-origin.mjs')return requestOriginModule;if(id==='next/server')return {NextResponse};if(id==='@supabase/ssr')return {createServerClient(_url,_key,{cookies}){return {auth:{getUser:async()=>{cookies.setAll([{name:'sb-test',value:'opaque',options:{}}]);return {data:{user:null}}}}}}};throw Error(id)}});
 const request={nextUrl:{pathname:'/craft',protocol:'http:'},headers:{get(name){return name==='x-forwarded-host'?'macmini-home.taile6a871.ts.net:8446':null}},cookies:{getAll(){return []},set(){}}};
 await exports.proxy(request);
 assert.equal(outputs[0].secure,true);
});
test('callback retains writable cookie adapter and secure httpOnly policy',()=>{
 assert.match(callback,/serverSupabaseClient\(\)/);
 assert.match(server,/httpOnly:true,secure,sameSite:'lax',path:'\/'/);
});
test('RSC read-only store never writes while Route Handler adapter emits protected cookies',async()=>{
 const writes=[];
 const store={getAll:()=>[],set(...args){writes.push(args);throw Error('Cookies can only be modified in a Server Action or Route Handler')}};
 let adapter;
 const mockCreateServerClient=(_url,_key,{cookies})=>{adapter=cookies;return {auth:{getUser:async()=>{cookies.setAll([{name:'sb-test',value:'opaque-test',options:{maxAge:60}}]);return {data:{user:{id:'test-user'}},error:null}}}}};
 const compiled=ts.transpileModule(server,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 runInNewContext(compiled,{exports,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'https://example.invalid',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-public-key'}},require(id){if(id==='@/lib/request-origin.mjs')return requestOriginModule;if(id==='next/headers')return {cookies:async()=>store,headers:async()=>({get:()=>null})};if(id==='@supabase/ssr')return {createServerClient:mockCreateServerClient};if(id==='@/features/when-we-meet/normalize.mjs')return {normalizeRoom:x=>x,normalizeResponses:x=>x};if(id==='@/features/when-we-meet/room-permissions.mjs')return {roomForViewer:x=>x};throw Error(id)}});
 const context=await exports.currentSupabaseUser();
 assert.equal(context.user.id,'test-user');
 assert.equal(writes.length,0,'RSC must not call cookieStore.set');
 await exports.serverSupabaseClient();
 assert.throws(()=>adapter.setAll([{name:'sb-test',value:'opaque-test',options:{}}]),/Cookies can only be modified/);
 assert.equal(writes.length,1,'Route Handler adapter must still attempt writing');
 assert.equal(writes[0][2].httpOnly,true);
 assert.equal(writes[0][2].sameSite,'lax');
});
