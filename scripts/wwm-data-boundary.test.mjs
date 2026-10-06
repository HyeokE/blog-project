import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dataBoundaryLeaks} from './wwm-data-boundary.mjs';
const runtime='src/features/when-we-meet/date-confirmation-runtime.ts';
const member='function memberStatus(data:unknown){\n const r=data as Record<string,unknown>;\n return {startDate:r.start_date};\n}';
for(const path of ['src/features/when-we-meet/date-normalize.mjs','src/features/when-we-meet/date-confirmation-persistence.mjs']){
 test(`declared DB adapter ${path} admits raw columns`,()=>assert.deepEqual(dataBoundaryLeaks(path,'const startDate = row.start_date;'),[]));
}
test('only declared memberStatus body admits raw rows',()=>assert.deepEqual(dataBoundaryLeaks(runtime,member),[]));
test('memberStatus overload declaration prevents body exemption',()=>assert.deepEqual(dataBoundaryLeaks(runtime,'function memberStatus(data:unknown):unknown;\nfunction memberStatus(data:unknown){return r.start_date;}'),[`${runtime}:2`]));
test('single bodyless memberStatus declaration remains checked',()=>assert.deepEqual(dataBoundaryLeaks(runtime,'declare function memberStatus(start_date:unknown):unknown;'),[`${runtime}:1`]));
test('duplicate memberStatus bodies remain checked',()=>assert.deepEqual(dataBoundaryLeaks(runtime,'function memberStatus(){return r.start_date;}\nfunction memberStatus(){return r.end_date;}'),[`${runtime}:1`,`${runtime}:2`]));
test('malformed source prevents memberStatus body exemption',()=>assert.deepEqual(dataBoundaryLeaks(runtime,'function memberStatus(){return r.start_date;}\nconst broken = ;'),[`${runtime}:1`]));
test('same runtime appended raw row remains a leak',()=>assert.deepEqual(dataBoundaryLeaks(runtime,`${member}\nconst leaked = r.start_date;`),[`${runtime}:5`]));
test('same runtime unrecognized function remains a leak',()=>assert.deepEqual(dataBoundaryLeaks(runtime,'function other(){return r.start_date;}'),[`${runtime}:1`]));
test('memberStatus signature is outside admitted body',()=>assert.deepEqual(dataBoundaryLeaks(runtime,'function memberStatus(start_date:unknown){return null;}'),[`${runtime}:1`]));
test('similar adapter filename remains checked',()=>assert.deepEqual(dataBoundaryLeaks('src/features/when-we-meet/date-normalize-ui.mjs',member),['src/features/when-we-meet/date-normalize-ui.mjs:3']));
test('nonadapter routes remain checked',()=>assert.equal(dataBoundaryLeaks('src/app/api/craft/when-we-meet/route.ts','const value = row.start_date;').length,1));
test('AST body handles braces in strings comments regex and nested blocks',()=>assert.deepEqual(dataBoundaryLeaks(runtime,'function memberStatus(data:unknown){const text="}"; /* } */ if(data){const re=/}/; return {startDate:r.start_date};}}\nconst leaked=r.end_date;'),[`${runtime}:2`]));
test('existing SQL query builder exemptions remain unchanged',()=>assert.deepEqual(dataBoundaryLeaks('src/features/when-we-meet/api.ts',"client.select('start_date,end_date').eq('owner_id',id).order('created_at');\nclient.update({start_date:value});"),[]));
test('actual runtime appended leakage is not concealed',()=>{
 const source=readFileSync(new URL(`../${runtime}`,import.meta.url),'utf8');
 assert.deepEqual(dataBoundaryLeaks(runtime,source),[]);
 assert.deepEqual(dataBoundaryLeaks(runtime,`${source}\nconst leaked = r.start_date;`),[`${runtime}:${source.split('\n').length+1}`]);
});
test('actual runtime memberStatus exposes only camelCase keys',async()=>{
 const {createJiti}=await import('jiti');
 const jiti=createJiti(import.meta.url,{alias:{'server-only':new URL('../node_modules/next/dist/compiled/server-only/empty.js',import.meta.url).pathname,'@':new URL('../src/',import.meta.url).pathname},moduleCache:false});
 const {createDateConfirmationRuntime}=await jiti.import('../src/features/when-we-meet/date-confirmation-runtime.ts');
 const raw={revision:1,status:'confirmed',schedule_mode:'date',title:'T',start_date:'2099-02-28',end_date:'2099-03-01',starts_at:null,ends_at:null,timezone:'UTC',google_event_url:'https://www.google.com/calendar/test',organizer_email:'Synthetic@example.test'};
 const status=await createDateConfirmationRuntime().loadStatus({client:{rpc:async()=>({data:raw,error:null})}},'synthetic-room');
 assert.deepEqual(status,{revision:1,status:'confirmed',scheduleMode:'date',title:'T',startDate:'2099-02-28',endDate:'2099-03-01',timezone:'UTC',url:raw.google_event_url});
 const keys=value=>value&&typeof value==='object'?Object.entries(value).flatMap(([key,child])=>[key,...keys(child)]):[];
 assert.deepEqual(keys(status).filter(key=>/^[a-z]+(?:_[a-z]+)+$/.test(key)),[]);
});
