import test from 'node:test';import assert from 'node:assert/strict';
import {probeAuthHealth} from '../src/lib/supabase/health.mjs';
test('auth health only reports bounded public status',async()=>{
 const result=await probeAuthHealth({url:'https://project.supabase.co',key:'secret',fetcher:async(_url,options)=>{assert.equal(options.headers.apikey,'secret');return {ok:true}}});
 assert.deepEqual(result,{status:'ok',service:'supabase',scope:'auth'});assert.doesNotMatch(JSON.stringify(result),/secret|project/);
});
test('failure, timeout and bad configuration never reveal upstream detail',async()=>{
 for(const options of [{url:'https://project.supabase.co',key:'secret',fetcher:async()=>{throw new Error('secret')}},{url:'https://project.supabase.co',key:'secret',fetcher:async()=>({ok:false})},{url:'bad',key:'secret'}]){
 const result=await probeAuthHealth(options);assert.equal(result.status,'unavailable');assert.doesNotMatch(JSON.stringify(result),/secret|project/);
 }
});
