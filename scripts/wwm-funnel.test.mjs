import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import test from 'node:test';

const root=fileURLToPath(new URL('..',import.meta.url));
const stub=pathToFileURL(`${root}scripts/fixtures/funnel-stub-analytics.mjs`).href;
registerHooks({resolve(specifier,context,next){
 if(specifier==='@/utils/analytics')return {url:stub,shortCircuit:true};
 if(specifier==='@/constants/analytics')return {url:pathToFileURL(`${root}src/constants/analytics.ts`).href,shortCircuit:true};
 return next(specifier,context);
}});
const {events}=await import(stub);
const funnel=await import(pathToFileURL(`${root}src/features/when-we-meet/funnel.ts`).href);
const constants=await import(pathToFileURL(`${root}src/constants/analytics.ts`).href);
const reset=()=>{funnel.resetFunnelsForTest();events.length=0};

test('steps report once with their index and the furthest step is what exit reports',()=>{
 reset();
 funnel.funnelStep('create','dialog_open');
 funnel.funnelStep('create','title_filled');
 funnel.funnelStep('create','title_filled');
 funnel.funnelEnd('create','dialog_close');
 const [open,title,exit]=events;
 assert.equal(events.length,3);
 assert.deepEqual([open.name,open.step,open.step_index],['wwm_funnel','dialog_open',0]);
 assert.deepEqual([title.step,title.step_index],['title_filled',2]);
 assert.deepEqual([exit.name,exit.reason,exit.completed,exit.last_step,exit.last_step_index,exit.steps_reached],['wwm_exit','dialog_close',false,'title_filled',2,2]);
});

test('completion is reported on exit, and a finished flow never exits twice',()=>{
 reset();
 funnel.funnelStep('create','dialog_open');
 funnel.funnelComplete('create','created');
 funnel.funnelEnd('create','open_meeting');
 funnel.funnelEnd('create','navigate');
 assert.equal(events.filter(e=>e.name==='wwm_exit').length,1);
 assert.equal(events.at(-1).completed,true);
});

test('a flow that never started reports nothing; signals do not advance the funnel',()=>{
 reset();
 funnel.funnelEnd('invite','navigate');
 funnel.funnelSignal('create','validation_error',{field:'title'});
 assert.deepEqual(events.map(e=>[e.name,e.step,e.step_index,e.signal]),[['wwm_funnel','validation_error',-1,true]]);
 funnel.funnelStep('create','dialog_open');
 funnel.funnelEnd('create','dialog_close');
 assert.equal(events.at(-1).last_step_index,0);
});

test('exit carries the registered context and survives a throwing provider',()=>{
 reset();
 funnel.funnelStep('room','room_view');
 funnel.funnelContext('room',()=>({selected_count:3,unsaved:true}));
 funnel.funnelEnd('room','navigate');
 assert.equal(events.at(-1).selected_count,3);
 assert.equal(events.at(-1).unsaved,true);
 reset();
 funnel.funnelStep('room','room_view');
 funnel.funnelContext('room',()=>{throw new Error('boom')});
 funnel.funnelEnd('room','navigate');
 assert.equal(events.at(-1).name,'wwm_exit');
});

test('handoff exits are sent by beacon, ordinary ones are not',()=>{
 reset();
 funnel.funnelStep('onboarding','guest_view');
 funnel.funnelEnd('onboarding','handoff');
 assert.equal(events.at(-1).transport_type,'beacon');
 funnel.funnelStep('onboarding','guest_view');
 funnel.funnelEnd('onboarding','navigate');
 assert.equal(events.at(-1).transport_type,undefined);
});

test('every declared step and signal has a call site, and params stay free of user content',()=>{
 const dir=`${root}src`;
 const files=[];
 (function walk(d){for(const e of readdirSync(d,{withFileTypes:true})){const p=`${d}/${e.name}`;if(e.isDirectory())walk(p);else if(/\.(tsx?|mjs)$/.test(e.name)&&!/\.(d\.ts|stories\.tsx)$/.test(e.name)&&!e.name.includes('stories'))files.push(p)}})(dir);
 const source=files.filter(f=>!f.endsWith('funnel.ts')&&!f.endsWith('constants/analytics.ts')).map(f=>readFileSync(f,'utf8')).join('\n');
 for(const [flow,steps] of Object.entries(constants.ANALYTICS_WWM_FUNNELS)){
  for(const step of steps)assert.match(source,new RegExp(`funnel(Step|Complete|StepIfActive)\\('${flow}','${step}'`),`${flow}.${step} is never reported`);
 }
 for(const signal of Object.values(constants.ANALYTICS_WWM_SIGNALS)){
  assert.match(source,new RegExp(`funnelSignal\\('(\\w+)','${signal}'`),`signal ${signal} is never reported`);
 }
 const calls=[...source.matchAll(/funnel(?:Step|Complete|StepIfActive|Signal|End)\([^;]*?\{([^}]*)\}/g)].map(m=>m[1]).join(' ');
 assert.doesNotMatch(calls,/\b(name|title|email|roomId|token|slots|link)\s*:/);
});
