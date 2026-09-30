test('remote update arriving during a save is not lost after acknowledgement',async()=>{
 let resolve;let rendered;const queue=createAvailabilityAutosave({initial:{name:'J',slots:[],version:'1'},delay:0,save:()=>new Promise(r=>{resolve=r}),onDraft:value=>{rendered=value}});
 queue.update({name:'J',slots:['a']});await new Promise(r=>setTimeout(r,5));
 queue.remote({name:'J',slots:['a','b'],version:'3'});resolve({name:'J',slots:['a'],version:'2'});await new Promise(r=>setTimeout(r,5));
 assert.deepEqual(rendered.slots,['a','b']);queue.dispose();
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createAvailabilityAutosave} from '../src/features/when-we-meet/autosave.mjs';
const pause=()=>new Promise(resolve=>setTimeout(resolve,10));
const initial={name:'Jason',slots:[]};
test('coalesces rapid changes and never writes initial hydration',async()=>{
 const writes=[];const queue=createAvailabilityAutosave({initial,delay:0,save:async v=>writes.push(v)});
 queue.update(initial);await pause();assert.equal(writes.length,0);
 queue.update({name:'Jason',slots:['a']});queue.update({name:'Jason',slots:['a','b']});await pause();
 assert.deepEqual(writes,[{name:'Jason',slots:['a','b']}]);queue.dispose();
});
test('serializes writes and only acknowledges the snapshot actually saved',async()=>{
 const writes=[],acks=[];let complete;
 const queue=createAvailabilityAutosave({initial,delay:0,save:v=>{writes.push(v);return new Promise(resolve=>{complete=resolve})},onSaved:v=>acks.push(v)});
 queue.update({name:'Jason',slots:['a']});await pause();
 queue.update({name:'Jason',slots:['b']});await pause();assert.equal(writes.length,1);
 complete();await pause();assert.equal(writes.length,2);assert.deepEqual(acks[0].slots,['a']);
 complete();await pause();assert.deepEqual(acks.at(-1).slots,['b']);queue.dispose();
});
test('reverting during an in-flight write sends the revert afterward',async()=>{
 const writes=[];let complete;
 const queue=createAvailabilityAutosave({initial,delay:0,save:v=>{writes.push(v);return new Promise(resolve=>{complete=resolve})}});
 queue.update({name:'Jason',slots:['a']});await pause();queue.update(initial);complete();await pause();
 assert.deepEqual(writes.map(x=>x.slots),[['a'],[]]);complete();await pause();queue.dispose();
});
test('failed saves preserve latest draft, stop automatic retry, and allow explicit retry',async()=>{
 let attempts=0;const states=[];
 const queue=createAvailabilityAutosave({initial,delay:0,save:async()=>{if(++attempts===1)throw new Error('offline')},onState:s=>states.push(s)});
 queue.update({name:'Jason',slots:['a']});await pause();await pause();assert.equal(attempts,1);assert.equal(states.at(-1),'error');
 queue.retry();await pause();assert.equal(attempts,2);assert.equal(states.at(-1),'saved');queue.dispose();
});
test('no mutation after dispose and no acknowledgement from stale in-flight scope',async()=>{
 let complete;let acks=0;
 const queue=createAvailabilityAutosave({initial,delay:0,save:()=>new Promise(r=>{complete=r}),onSaved:()=>acks++});
 queue.update({name:'Jason',slots:['a']});await pause();queue.dispose();complete();await pause();assert.equal(acks,0);
});
