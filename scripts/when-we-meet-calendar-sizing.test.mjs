import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarSizing,eventBlocks} from '../src/features/when-we-meet/calendar-rows.mjs';
test('compact default and wide overlap groups preserve minimum event width',()=>{
 assert.equal(calendarSizing([]).dayWidth,144);
 const two=calendarSizing([{lanes:2}]);assert.equal(two.rowHeight,44);assert.ok(two.dayWidth-two.participantGutter-12>=96);
 const many=calendarSizing([{lanes:8}]);assert.equal(many.participantGutter,128);assert.ok(many.dayWidth-many.participantGutter-12>=96);
});
test('non-overlapping participants do not inflate date width',()=>{
 assert.equal(calendarSizing(Array.from({length:20},()=>({lanes:1}))).dayWidth,144);
});
test('event offsets use the chosen compact row height',()=>{
 const slot={id:'2026-10-01T00:00:00.000Z',date:'2026-10-01'};
 const blocks=eventBlocks([{byDate:{}},{byDate:{[slot.date]:slot}}],[slot.date],[{userId:'a',runs:[{date:slot.date,slotIds:[slot.id]}]}],44);
 assert.equal(blocks[0].top,44);assert.equal(blocks[0].height,44);
});
