import assert from 'node:assert/strict';
import test from 'node:test';
import {creationErrors,todayInTimezone} from '../src/features/when-we-meet/creation-validation.mjs';
const now=new Date('2026-09-30T15:30:00Z');
const valid={title:'Planning',startDate:'2026-10-01',endDate:'2026-10-14',timezone:'Asia/Seoul',name:'Alex'};
test('today is calendar date in selected zone, not device or UTC date',()=>{
 assert.equal(todayInTimezone('Asia/Seoul',now),'2026-10-01');
 assert.equal(todayInTimezone('America/Los_Angeles',now),'2026-09-30');
 assert.equal(todayInTimezone('Mars/Olympus',now),null);
});
test('required whitespace and missing dates identify individual fields',()=>{
 assert.deepEqual(creationErrors({...valid,title:' ',name:' ',startDate:'',endDate:''},now),{title:'Enter a title (up to 100 characters).',dates:'Choose a start and end date.',name:'Enter your name (up to 50 characters).'});
});
test('length limits and invalid timezone are field-specific',()=>{
 const errors=creationErrors({...valid,title:'x'.repeat(101),name:'x'.repeat(51),timezone:'Mars/Olympus'},now);
 assert.deepEqual(Object.keys(errors),['title','timezone','name']);
});
test('stale restored draft, incomplete and malformed date ranges are rejected',()=>{
 assert.match(creationErrors({...valid,startDate:'2026-09-30',endDate:'2026-10-01'},now).dates,/past/i);
 assert.ok(creationErrors({...valid,endDate:''},now).dates);
 assert.ok(creationErrors({...valid,startDate:'2026-02-30'},now).dates);
});
test('fourteen inclusive days pass and fifteen fail; correction clears error',()=>{
 assert.deepEqual(creationErrors(valid,now),{});
 assert.ok(creationErrors({...valid,endDate:'2026-10-15'},now).dates);
 assert.deepEqual(creationErrors({...valid,title:'  corrected  '},now),{});
});
