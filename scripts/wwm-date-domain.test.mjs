import test from 'node:test';
import assert from 'node:assert/strict';
import * as domain from '../src/features/when-we-meet/date-availability.mjs';
const {isCalendarDate}=domain;
const room=Object.freeze({startDate:'2026-10-01',endDate:'2026-10-03'});
const d1='2026-10-01',d2='2026-10-02',d3='2026-10-03';
const people=Object.freeze(['member-z','member-a','member-empty','member-missing'].map(userId=>Object.freeze({userId,displayName:'Same name',isAdmin:false,hasAvailability:false})));
const responses=Object.freeze([
 Object.freeze({userId:'member-z',displayName:'Same name',availableDates:Object.freeze([d2,d1,d1])}),
 Object.freeze({userId:'member-a',displayName:'Same name',availableDates:Object.freeze([d2])}),
 Object.freeze({userId:'member-empty',displayName:'Same name',availableDates:Object.freeze([])}),
 Object.freeze({userId:'foreign',displayName:'Same name',availableDates:Object.freeze([d1])}),
]);
test('aggregate uses saved dates and authorized actual user IDs, not names or hasAvailability',()=>{
 const before=JSON.stringify({room,responses,people});
 assert.deepEqual(domain.aggregateDateAvailability(room,responses,people),{totalMembers:4,dates:[
  {date:d1,availableUserIds:['member-z'],unavailableUserIds:['member-a'],nonrespondentUserIds:['member-empty','member-missing']},
  {date:d2,availableUserIds:['member-a','member-z'],unavailableUserIds:[],nonrespondentUserIds:['member-empty','member-missing']},
  {date:d3,availableUserIds:[],unavailableUserIds:['member-a','member-z'],nonrespondentUserIds:['member-empty','member-missing']},
 ]});
 assert.equal(JSON.stringify({room,responses,people}),before);
});
test('unknown roster remains unknown while empty roster is truly zero',()=>{
 const result=domain.aggregateDateAvailability(room,responses,null);
 assert.equal(result.totalMembers,null);
 assert.deepEqual(result.dates[0],{date:d1,availableUserIds:['foreign','member-z'],unavailableUserIds:null,nonrespondentUserIds:null});
 assert.deepEqual(domain.aggregateDateAvailability(room,responses,[]),{totalMembers:0,dates:[d1,d2,d3].map(date=>({date,availableUserIds:[],unavailableUserIds:[],nonrespondentUserIds:[]}))});
});
test('aggregation rejects duplicate response IDs without guessing updatedAt precedence',()=>{
 for(const roster of [people,null,[]])assert.throws(()=>domain.aggregateDateAvailability(room,[responses[0],{...responses[0],updatedAt:'2099-01-01'}],roster),/Duplicate response/);
});
test('aggregation fails closed for malformed dates, rows, IDs and collections',()=>{
 for(const availableDates of [undefined,null,['2026-02-30'],['2026-10-04'],Array(1)])assert.throws(()=>domain.aggregateDateAvailability(room,[{userId:'member-z',displayName:'Name',availableDates}],people));
 // Even excluded foreign rows must not conceal malformed civil dates.
 assert.throws(()=>domain.aggregateDateAvailability(room,[{userId:'foreign',displayName:'Name',availableDates:['2026-02-30']}],people));
 for(const row of [null,{}, {userId:'',displayName:'Name',availableDates:[]},{userId:1,displayName:'Name',availableDates:[]},{userId:'member-z',availableDates:[]}])assert.throws(()=>domain.aggregateDateAvailability(room,[row],people));
 for(const roster of [undefined,{},[null],[{userId:''}]])assert.throws(()=>domain.aggregateDateAvailability(room,[],roster));
 assert.throws(()=>domain.aggregateDateAvailability(room,null,people));
});
test('aggregation deduplicates roster IDs and handles rooms without saved responses',()=>{
 const roster=[...people,people[0]];
 const result=domain.aggregateDateAvailability(room,[],roster);
 assert.equal(result.totalMembers,4);
 for(const day of result.dates)assert.deepEqual(day,{date:day.date,availableUserIds:[],unavailableUserIds:[],nonrespondentUserIds:['member-a','member-empty','member-missing','member-z']});
 assert.throws(()=>domain.aggregateDateAvailability(room,[],Array(1)),TypeError);
});
test('merge applies only local additions and removals while preserving remote edits',()=>{
 const merge=domain.mergeAvailableDateChanges;
 const base=Object.freeze([d2,d1]),desired=Object.freeze([d2,d3,d3]),current=Object.freeze([d1]);
 assert.deepEqual(merge(base,desired,current),[d3]);
 assert.deepEqual(merge([d1],[d1],[d2,d3,d2]),[d2,d3]);
 assert.deepEqual(merge([],[],[]),[]);
 assert.deepEqual(merge([d1],[],[d1,d3]),[d3]);
 assert.deepEqual(merge([], [d1], [d1,d2]),[d1,d2]);
 assert.deepEqual(base,[d2,d1]);assert.deepEqual(desired,[d2,d3,d3]);assert.deepEqual(current,[d1]);
 for(let i=0;i<3;i++){const args=[[],[],[]];args[i]=['2026-02-30'];assert.throws(()=>merge(...args),RangeError);args[i]=null;assert.throws(()=>merge(...args),TypeError);}
});
test('normalize validates every value and room, deduplicates, sorts and leaves input unchanged',()=>{
 const normalize=domain.normalizeAvailableDates,values=Object.freeze([d3,d1,d1]);
 assert.deepEqual(normalize(values,room),[d1,d3]);assert.deepEqual(normalize([],room),[]);
 assert.deepEqual(values,[d3,d1,d1]);
 for(const values of [null,{},'2026-10-01',[d1,'2026-02-30'],['2026-09-30'],['2026-10-04'],Array(2)])assert.throws(()=>normalize(values,room));
 for(const badRoom of [null,{}, {startDate:d3,endDate:d1},{startDate:'2026-01-01',endDate:'2026-01-29'}])assert.throws(()=>normalize([],badRoom));
});
test('inclusive range accepts historical dates, same day and 28 days but rejects 29, reverse and invalid',()=>{
 const range=domain.datesInRange;
 assert.deepEqual(range('0001-01-01','0001-01-01'),['0001-01-01']);
 assert.deepEqual(range('2024-02-28','2024-03-01'),['2024-02-28','2024-02-29','2024-03-01']);
 const days=range('2026-01-01','2026-01-28');assert.equal(days.length,28);assert.equal(days[27],'2026-01-28');
 assert.deepEqual(range('9999-12-31','9999-12-31'),['9999-12-31']);
 for(const args of [['2026-01-01','2026-01-29'],['2026-01-02','2026-01-01'],['2026-02-30','2026-03-01'],[null,'2026-01-01']])assert.throws(()=>range(...args),RangeError);
});
test('strict Gregorian civil dates support years 0001..9999',()=>{
 for(const value of ['0001-01-01','0099-12-31','2000-02-29','2024-02-29','9999-12-31'])assert.equal(isCalendarDate(value),true,value);
 for(const value of [null,undefined,1,{},'0000-01-01','10000-01-01','2026-2-01','2026-02-30','1900-02-29','2026-00-01','2026-13-01','2026-01-00','2026-04-31','2026-01-01T00:00:00Z',' 2026-01-01','2026-01-01\n'])assert.equal(isCalendarDate(value),false,String(value));
});
test('next civil day crosses month, leap, century, year and DST boundaries without instants',()=>{
 const next=domain.nextCalendarDate;
 for(const [a,b] of [['2024-02-28','2024-02-29'],['2024-02-29','2024-03-01'],['1900-02-28','1900-03-01'],['2026-04-30','2026-05-01'],['0099-12-31','0100-01-01'],['2026-12-31','2027-01-01'],['2026-03-08','2026-03-09'],['2026-11-01','2026-11-02']])assert.equal(next(a),b);
 for(const bad of ['2026-02-30','0000-01-01',null,'9999-12-31'])assert.throws(()=>next(bad),RangeError);
});
