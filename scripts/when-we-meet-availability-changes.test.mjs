import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeAvailability} from '../src/features/when-we-meet/availability-changes.mjs';
const v=(slots,name='Jason')=>({name,slots});
test('a stale tab adds its slot without removing another tab addition',()=>{
 assert.deepEqual(mergeAvailability(v(['a']),v(['b']),v([])),v(['a','b']));
});
test('explicit removals affect only the edited slots',()=>{
 assert.deepEqual(mergeAvailability(v(['a','b','c']),v(['b']),v(['a','b'])),v(['b','c']));
});
test('unmodified stale names do not undo another tab rename',()=>{
 assert.deepEqual(mergeAvailability(v(['a'],'New name'),v(['b']),v([])),v(['a','b'],'New name'));
});
test('explicit rename applies and duplicate retry is idempotent',()=>{
 const current=v(['a']),base=v([]),desired=v(['b'],'Updated');
 const once=mergeAvailability(current,desired,base);
 assert.deepEqual(mergeAvailability(once,desired,base),once);
});
