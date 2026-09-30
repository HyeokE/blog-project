import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {Writable} from 'node:stream';
import React, {Suspense, use} from 'react';
import {renderToPipeableStream} from 'react-dom/server';
import ts from 'typescript';
import * as meetingCopy from '../src/features/when-we-meet/meeting-copy.mjs';

// Isolated React SSR probe: execute actual production async section code, inject only the data reader.
const require=createRequire(import.meta.url);
const root=new URL('../',import.meta.url);
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no});return {promise,resolve,reject}}
// Unstubbed '@/' imports (e.g. analytics constants) are real source modules, transpiled the same way.
function aliased(id){const base=`src/${id.slice(2)}`;const file=['.ts','.tsx','/index.ts'].map(ext=>base+ext).find(candidate=>fs.existsSync(new URL(candidate,root)));if(!file)throw new Error(`Cannot find module '${id}'`);return loadComponent(file,{})}
function loadComponent(file,imports){const source=fs.readFileSync(new URL(file,root),'utf8');const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};vm.runInNewContext(`(function(require,module,exports){${code}\n})`,{},{filename:file})(id=>id.endsWith('.css')?{}:(imports[id]??(id.startsWith('@/')?aliased(id):require(id))),module,module.exports);return module.exports.default?Object.assign(module.exports.default,module.exports):module.exports}
const fixture={id:'fixture-room',ownerId:'fixture-user',title:'Fixture meeting',startDate:'2026-10-01',endDate:'2026-10-02',startTime:'09:00',endTime:'18:00',timezone:'Asia/Seoul',createdAt:'2026-09-30T00:00:00Z',participantCount:2};
function stream(element){const chunks=[];const output=new Writable({write(chunk,_encoding,next){chunks.push(chunk.toString());next()}});let ready;const shell=new Promise(r=>ready=r);let finished;const done=new Promise(r=>finished=r);const errors=[];const render=renderToPipeableStream(element,{onShellReady(){render.pipe(output);ready()},onError(error){errors.push(error)}});output.on('finish',finished);return {chunks,shell,done,errors}}
// OwnedMeetings presentational leaves (icon count, empty state) are not under test here; stub them so only the streaming contract is exercised.
const ownedPresentation={'@/features/when-we-meet/ParticipantCount':{ParticipantCount:({count})=>React.createElement('span',{className:'wwm-participant-count'},String(count??'—'))},'@/features/when-we-meet/EmptyMeetings':{EmptyMeetings:()=>React.createElement('div',{role:'status'},'No meetings yet')}};
function section(Section,fallback){let attempt;function Holder(){if(!attempt)attempt=Section({});return use(attempt)}return React.createElement('main',null,React.createElement('h1',null,'When We Meet'),React.createElement(Suspense,{fallback},React.createElement(Holder)))}

test('actual OwnedMeetings streams geometry-matched fallback, then deferred owned row',async()=>{
 const read=deferred();const OwnedMeetings=loadComponent('src/app/craft/when-we-meet/OwnedMeetings.tsx',{'@/lib/supabase/server':{ownedCraftMeetings:()=>read.promise},'@/features/when-we-meet/ServerSectionRetry':{default:()=>null},'next/navigation':{unstable_rethrow:()=>{}},'@/features/when-we-meet/meeting-copy.mjs':meetingCopy,...ownedPresentation,'next/link':{default:({href,children})=>React.createElement('a',{href},children)}});
 const skeleton=loadComponent('src/features/when-we-meet/ServerSkeletons.tsx',{'@/container/light-wall/WallBackLink':{default:({children})=>React.createElement('a',null,children)},'./LoadingState':{LoadingState:({label})=>React.createElement('span',{role:'status'},label)}});
 const rendered=stream(section(OwnedMeetings,React.createElement(skeleton.MeetingRowsSkeleton)));
 await rendered.shell;await new Promise(r=>setTimeout(r,10));assert.match(rendered.chunks.join(''),/Loading meetings/,String(rendered.errors));assert.match(rendered.chunks.join(''),/wwm-skeleton-meeting/);assert.doesNotMatch(rendered.chunks.join(''),/Fixture meeting/);
 read.resolve({meetings:[{...fixture,confirmationStatus:'confirmed'}],userId:'fixture-user'});await rendered.done;
 assert.match(rendered.chunks.join(''),/Fixture meeting/);assert.match(rendered.chunks.join(''),/wwm-meeting-tag">Confirmed</,'a confirmed meeting carries a quiet tag');assert.match(rendered.chunks.join(''),/data-meeting-id="fixture-room"/);assert.match(rendered.chunks.join('').replaceAll('<!-- -->',''),/2026\.10\.01 – 10\.02 · 09:00–18:00 · Asia\/Seoul/,'camelCase meeting fields render');assert.match(rendered.chunks.join(''),/wwm-participant-count">2</);assert.match(rendered.chunks.join(''),/\/craft\/when-we-meet\/fixture-room/);assert.deepEqual(rendered.errors,[]);
});
test('actual OwnedMeetings guest resolution returns no private rows',async()=>{
 const read=deferred();const OwnedMeetings=loadComponent('src/app/craft/when-we-meet/OwnedMeetings.tsx',{'@/lib/supabase/server':{ownedCraftMeetings:()=>read.promise},'@/features/when-we-meet/ServerSectionRetry':{default:()=>null},'next/navigation':{unstable_rethrow:()=>{}},'@/features/when-we-meet/meeting-copy.mjs':meetingCopy,...ownedPresentation,'next/link':{default:({children})=>React.createElement('a',null,children)}});
 const result=stream(section(OwnedMeetings,React.createElement('i',null,'waiting')));await result.shell;await new Promise(r=>setTimeout(r,10));assert.match(result.chunks.join(''),/waiting/);read.resolve({meetings:[fixture],userId:null});await result.done;assert.doesNotMatch(result.chunks.join(''),/Fixture meeting/);
});
test('room page reaches Suspense before awaiting params',async()=>{
 const source=fs.readFileSync(new URL('src/app/craft/when-we-meet/[roomId]/page.tsx',root),'utf8');assert.match(source,/export default function Page/);assert.match(source,/async function RoomSection\(\{params\}/);assert.match(source,/const \{roomId\}=await params/);
});

test('server read failures become explicit section error results, not assumed client SSR catches',async()=>{
 const source=fs.readFileSync(new URL('src/app/craft/when-we-meet/[roomId]/page.tsx',root),'utf8');
 assert.match(source,/catch\(error\)/);assert.match(source,/unstable_rethrow\(error\)/);assert.match(source,/ServerSectionRetry/);
});

test('actual room section resolves failed read into retry payload and recovers on next read',async()=>{
 let fail=true;const module=loadComponent('src/app/craft/when-we-meet/[roomId]/page.tsx',{
  'next/navigation':{unstable_rethrow:()=>{}},
  '@/features/when-we-meet/WhenWeMeet':{default:function WhenWeMeet(){}},
  '@/lib/supabase/server':{
   currentSupabaseUser:async()=>({client:{},user:{id:'u'}}),
   craftRoomMetadata:async()=>{if(fail)throw new Error('private database diagnostic');return {room:fixture,responses:[],userId:'u'}},
   craftRoomResponses:async()=>[],
   craftRoomConfirmation:async()=>{if(fail)throw new Error('private confirmation diagnostic');return {status:'confirmed'}}
  },
  '@/features/when-we-meet/ServerSkeletons':{RoomSkeleton:()=>null},
  '@/features/when-we-meet/ServerSectionRetry':{default:function ServerSectionRetry(){}}
 });
 const props={params:Promise.resolve({roomId:'fixture-room'})};
 const failure=await module.RoomSection(props);assert.equal(failure.type.name,'ServerSectionRetry');assert.equal(JSON.stringify(failure).includes('private database diagnostic'),false);
 fail=false;const recovered=await module.RoomSection(props);assert.equal(recovered.type.name,'WhenWeMeet');assert.equal(recovered.props.initialRoom.room.title,'Fixture meeting');assert.equal(JSON.stringify(await recovered.props.responsesPromise),'{"responses":[]}');assert.equal(recovered.props.initialConfirmation.status,'confirmed');
});

test('owned meeting read failure returns isolated section retry',async()=>{
 const OwnedMeetings=loadComponent('src/app/craft/when-we-meet/OwnedMeetings.tsx',{
  '@/lib/supabase/server':{ownedCraftMeetings:async()=>{throw Error('private diagnostic')}},
  '@/features/when-we-meet/meeting-copy.mjs':meetingCopy,...ownedPresentation,
  '@/features/when-we-meet/ServerSectionRetry':{default:function MeetingsRetry(){}},
  'next/navigation':{unstable_rethrow:()=>{}},'next/link':{default:()=>null}
 });
 const result=await OwnedMeetings();assert.equal(result.type.name,'MeetingsRetry');assert.doesNotMatch(JSON.stringify(result),/private diagnostic/);
});
