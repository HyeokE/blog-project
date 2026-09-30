import test from 'node:test';import assert from 'node:assert/strict';
import {claimHealthCheck,resetHealthClaimForTest} from '../src/lib/supabase/health-once.mjs';
test('one claim per tab survives route remount and StrictMode',()=>{
 resetHealthClaimForTest();const store=new Map();const storage={getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)};
 assert.equal(claimHealthCheck(storage),true);assert.equal(claimHealthCheck(storage),false);
 resetHealthClaimForTest();assert.equal(claimHealthCheck(storage),false);
});
test('storage denied falls back to memory and never loops',()=>{
 resetHealthClaimForTest();const denied={getItem(){throw Error('denied')},setItem(){throw Error('denied')}};
 assert.equal(claimHealthCheck(denied),true);assert.equal(claimHealthCheck(denied),false);
});
