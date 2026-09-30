import assert from 'node:assert/strict';
import test from 'node:test';
import {revalidateCreationErrors} from '../src/features/when-we-meet/creation-validation.mjs';
const now=new Date('2026-09-30T15:30:00Z');
const valid={title:'Plan',startDate:'2026-10-01',endDate:'2026-10-02',timezone:'Asia/Seoul',name:'Alex'};
test('invalid whitespace edit retains title error until valid',()=>{
 assert.ok(revalidateCreationErrors({title:'Required'}, {...valid,title:'  '}, now).title);
 assert.equal(revalidateCreationErrors({title:'Required'},valid,now).title,undefined);
});
test('zone change and day rollover revalidate existing date errors',()=>{
 assert.match(revalidateCreationErrors({dates:'Required'}, {...valid,timezone:'Pacific/Kiritimati'},new Date('2026-10-01T15:30:00Z')).dates,/past/i);
 assert.equal(revalidateCreationErrors({dates:'Required'}, valid,now).dates,undefined);
});
