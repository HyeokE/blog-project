import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import * as civil from '../src/features/when-we-meet/date-calendar.mjs';
import {load} from './wwm-date-room-harness.mjs';
import fs from 'node:fs';
import postcss from 'postcss';

test('actual date tabs retain all values and full labels with date-only classes for conditional three/four tabs',()=>{
  const {DateRoomContent:Room}=load('DateWhenWeMeet.tsx',{
    react:{...React,useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:()=>{},useCallback:f=>f,useMemo:f=>f()},
    './useDateAvailabilitySync':{useDateAvailabilitySync:()=>({draft:null,receive(){},save(){}})},
    './i18n/WwmI18nProvider':{useWwmCopy:()=>({t:key=>key})},
    '@/components/ui/tabs':{Tabs:'Tabs',TabsList:'TabsList',TabsTrigger:'TabsTrigger',TabsContent:'TabsContent'},
    './date-availability.mjs':{aggregateDateAvailability:()=>({dates:[],totalMembers:null})},
  });
  for(const confirmationPanel of [undefined,React.createElement('Confirmation')]){
    const all=nodes(Room({initialRoom:{room:{...room,id:'room',title:'Date'},userId:'self'},responsesPromise:Promise.resolve({responses:[]}),confirmationPanel}));
    assert.equal(all.find(n=>n.type==='TabsList').props.className,'wwm-date-tabs');
    const triggers=all.filter(n=>n.type==='TabsTrigger');
    assert.deepEqual(triggers.map(n=>n.props.value),['availability','everyone','people',...(confirmationPanel?['confirmation']:[])]);
    assert.deepEqual(triggers.map(n=>n.props.children),['dateRoom.availability','dateRoom.everyone','people.heading',...(confirmationPanel?['dateRoom.confirmation']:[])]);
    assert.ok(triggers.every(n=>n.props.className==='wwm-date-tab'));
  }
});

test('date-only CSS declares unclipped mobile grid, one active treatment and modality-safe states',()=>{
  const css=fs.readFileSync(new URL('../src/features/when-we-meet/date-room.css',import.meta.url),'utf8');
  const root=postcss.parse(css);
  const rules=[];root.walkRules(rule=>{if(rule.selector.includes('wwm-date-tab'))rules.push(rule);});
  assert.ok(rules.length>0,'date-specific tab rules must exist');
  const declarations=rule=>Object.fromEntries(rule.nodes.filter(n=>n.type==='decl').map(n=>[n.prop,n.value]));
  const ruleFor=selector=>{const rule=rules.find(r=>r.selector===selector);assert.ok(rule,selector);return declarations(rule);};
  const scope='.wwm-date-room .wwm-date-tabs';
  const list=ruleFor(scope);assert.equal(list.display,'flex');assert.equal(list.width,'fit-content');assert.equal(list['max-width'],'100%');assert.equal(list.height,'auto');assert.equal(list['min-width'],'0');
  const mobile=rules.find(r=>r.selector===scope&&r.parent.type==='atrule'&&r.parent.params==='(max-width: 600px)');assert.ok(mobile,'600px grid');
  assert.deepEqual({...declarations(mobile)},{display:'grid',width:'100%','grid-template-columns':'repeat(2, minmax(0, 1fr))'});
  const cell=ruleFor(`${scope} .wwm-date-tab`);assert.equal(cell.height,'var(--craft-h-md)');assert.equal(cell['min-height'],'var(--craft-h-md)');assert.equal(cell['min-width'],'0');assert.equal(cell['box-sizing'],'border-box');assert.equal(cell['font-size'],'var(--craft-fs-14)');assert.equal(cell['line-height'],'20px');assert.equal(cell.background,'transparent');
  const active=ruleFor(`${scope} .wwm-date-tab[data-state='active']`);assert.equal(active.background,'var(--craft-ink)');assert.equal(active.color,'var(--craft-on-ink)');assert.equal(active['font-weight'],'var(--craft-fw-semibold)');
  assert.equal(ruleFor(`${scope} .wwm-date-tab::after`).content,'none');
  assert.ok(rules.some(r=>r.selector.includes(':hover')&&r.selector.includes("[data-state='inactive']")&&r.selector.includes(':not(:disabled)')&&r.selector.includes(':not([data-disabled])')));
  assert.ok(rules.some(r=>r.selector.includes(':disabled')&&declarations(r).cursor==='not-allowed'));
  assert.ok(rules.some(r=>r.selector.includes("[data-input-modality='keyboard']")&&r.selector.includes(':focus-visible')&&declarations(r).outline==='2px solid var(--craft-focus)'));
  assert.ok(rules.some(r=>r.selector.includes("[data-input-modality='pointer']")&&declarations(r).outline==='none'));
  for(const rule of rules){assert.ok(rule.selector.includes('.wwm-date-room'));const d=declarations(rule);assert.ok(!d.transform&&!d.translate&&!d.overflow&&!d['text-overflow']);if(d.transition)assert.match(d.transition,/^(?:background-color 140ms ease, color 140ms ease, opacity 140ms ease|none)$/);}
  assert.ok(css.includes('prefers-reduced-motion: reduce')&&css.includes('transition: none !important'));
});

function nodes(tree){if(!tree||typeof tree!=='object')return [];return [tree,...[tree.props?.children].flat().flatMap(nodes)];}
const room={startDate:'2026-10-01',endDate:'2026-10-03',timezone:'UTC'};
test('actual Calendar delegates multiple selection and rejects outside dates',()=>{let output;const {DateAvailabilityCalendar}=load('DateAvailabilityCalendar.tsx',{'react':React,'@/components/ui/calendar':{Calendar:'Calendar'},'./date-calendar.mjs':civil,'./i18n/WwmI18nProvider':{useWwmCopy:()=>({locale:'en'})}});assert.equal(typeof DateAvailabilityCalendar,'function');const tree=DateAvailabilityCalendar({room,selected:['2026-10-01'],onChange:value=>output=value,disabled:false});const calendar=nodes(tree).find(n=>n.type==='Calendar');assert.equal(calendar.props.mode,'multiple');calendar.props.onSelect([civil.toLocalDate('2026-10-02')]);assert.deepEqual(output,['2026-10-02']);calendar.props.onSelect([civil.toLocalDate('2026-10-04')]);assert.deepEqual(output,['2026-10-02']);assert.equal(calendar.props.showOutsideDays,false);});
test('date room mounts saved-only overview, disables unavailable baseline, hides unfinished confirmation',()=>{const {DateRoomContent:Room}=load('DateWhenWeMeet.tsx',{'react':{...React,useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:()=>{},useCallback:f=>f,useMemo:f=>f()},'./useDateAvailabilitySync':{useDateAvailabilitySync:()=>({draft:null,receive(){},save(){}})},'./i18n/WwmI18nProvider':{useWwmCopy:()=>({t:key=>key})},'@/components/ui/button':{Button:'Button'},'@/components/ui/tabs':{Tabs:'Tabs',TabsList:'TabsList',TabsTrigger:'TabsTrigger',TabsContent:'TabsContent'},'./DateAvailabilityCalendar':{DateAvailabilityCalendar:'DateAvailabilityCalendar'},'./DateRoomResponseLoader':{DateRoomResponseLoader:'Loader'},'./DateRoomSkeleton':{DateRoomSkeleton:'Skeleton'},'./PeoplePanel':{PeoplePanel:'PeoplePanel'},'./date-availability.mjs':{aggregateDateAvailability:()=>({dates:[],totalMembers:null})}});assert.equal(typeof Room,'function');const all=nodes(Room({initialRoom:{room:{...room,id:'room',title:'Date'},userId:'self'},responsesPromise:Promise.resolve({responses:[]})}));assert.equal(all.filter(n=>n.type==='TabsTrigger').length,3);assert.equal(all.some(n=>n.props?.value==='confirmation'),false);assert.equal(all.find(n=>n.type==='DateAvailabilityCalendar').props.disabled,true);assert.equal(all.find(n=>n.type==='PeoplePanel').props.roomId,'room');});
test('identity change hides private room immediately',()=>{const {default:Room}=load('DateWhenWeMeet.tsx',{'react':{...React,useState:v=>[v,()=>{}],useRef:v=>({current:v}),useEffect:()=>{},useCallback:f=>f,useMemo:f=>f()},'@/app/craft/CraftAccount':{useCraftAccount:()=>({user:{id:'other'},loading:false})},'./useDateAvailabilitySync':{useDateAvailabilitySync:()=>({draft:null,receive(){}})},'./date-availability.mjs':{aggregateDateAvailability:()=>({dates:[]})},'./i18n/WwmI18nProvider':{useWwmCopy:()=>({t:k=>k})}});assert.equal(Room({initialRoom:{room:{...room,id:'room'},userId:'self'},responsesPromise:Promise.resolve({responses:[]})}),null);});