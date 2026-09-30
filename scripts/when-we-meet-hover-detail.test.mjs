import test from 'node:test';
import assert from 'node:assert/strict';
import {createHoverDetail} from '../src/features/when-we-meet/hover-detail.mjs';
const wait=()=>new Promise(resolve=>setTimeout(resolve,15));
test('hover-only details close after leaving the event and popup',async()=>{
 const states=[];const ui=createHoverDetail(id=>states.push(id),5);ui.open('alex','hover');ui.leave();await wait();assert.deepEqual(states,['alex',null]);ui.dispose();
});
test('moving from event into popup cancels dismissal',async()=>{
 const states=[];const ui=createHoverDetail(id=>states.push(id),5);ui.open('alex','hover');ui.leave();ui.enter();await wait();assert.deepEqual(states,['alex']);ui.leave();await wait();assert.equal(states.at(-1),null);ui.dispose();
});
test('keyboard and click details survive pointer leaving; explicit dismissal still works',async()=>{
 const states=[];const ui=createHoverDetail(id=>states.push(id),5);ui.open('alex','focus');ui.leave();await wait();assert.equal(states.at(-1),'alex');ui.open('sam','pinned');ui.leave();await wait();assert.equal(states.at(-1),'sam');ui.close();assert.equal(states.at(-1),null);ui.dispose();
});
test('old hover timeout cannot close the next event or survive disposal',async()=>{
 const states=[];const ui=createHoverDetail(id=>states.push(id),5);ui.open('alex','hover');ui.leave();ui.open('sam','hover');await wait();assert.equal(states.at(-1),'sam');ui.leave();ui.dispose();await wait();assert.equal(states.at(-1),'sam');
});
