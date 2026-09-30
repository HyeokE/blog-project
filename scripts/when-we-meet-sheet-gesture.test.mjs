import test from 'node:test';
import assert from 'node:assert/strict';
import {releaseSheet,sheetDragFrame} from '../src/components/ui/sheet-gesture.mjs';

test('a short or slow drag settles back where it started',()=>{
 assert.equal(releaseSheet({dy:30,velocity:.1,expanded:false}),'stay');
 assert.equal(releaseSheet({dy:-30,velocity:-.1,expanded:false}),'stay');
 assert.equal(releaseSheet({dy:20,velocity:.1,expanded:true}),'stay');
});

test('dragging the default sheet down far enough or flicking it dismisses',()=>{
 assert.equal(releaseSheet({dy:120,velocity:.2,expanded:false}),'close');
 assert.equal(releaseSheet({dy:24,velocity:.9,expanded:false}),'close');
});

test('dragging up or flicking up expands to the large detent',()=>{
 assert.equal(releaseSheet({dy:-80,velocity:-.2,expanded:false}),'expand');
 assert.equal(releaseSheet({dy:-20,velocity:-.9,expanded:false}),'expand');
 assert.equal(releaseSheet({dy:-200,velocity:-1,expanded:true}),'stay');
});

test('an expanded sheet collapses first; only a long drag dismisses it outright',()=>{
 assert.equal(releaseSheet({dy:90,velocity:.2,expanded:true}),'collapse');
 assert.equal(releaseSheet({dy:30,velocity:.9,expanded:true}),'collapse');
 assert.equal(releaseSheet({dy:420,velocity:.3,expanded:true,height:500}),'close');
});

test('the sheet follows the finger downward and grows upward with resistance past the top',()=>{
 assert.deepEqual(sheetDragFrame({dy:50,startHeight:400,maxHeight:700}),{translate:50,height:400});
 assert.deepEqual(sheetDragFrame({dy:-100,startHeight:400,maxHeight:700}),{translate:0,height:500});
 const past=sheetDragFrame({dy:-400,startHeight:400,maxHeight:700});
 assert.equal(past.translate,0);
 assert.ok(past.height>700&&past.height<760,'rubber-band beyond the large detent');
});
