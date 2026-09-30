import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/features/when-we-meet/WhenWeMeet.tsx',import.meta.url),'utf8');
const preview=readFileSync(new URL('../src/features/when-we-meet/GuestCalendarPreview.tsx',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/features/when-we-meet/guest-calendar-preview.css',import.meta.url),'utf8');
test('guest preview is synthetic and noninteractive',()=>{assert.match(preview,/aria-hidden="true" inert/);assert.match(preview,/const availability=new Set/);assert.doesNotMatch(preview,/\bloadRoom\b|\bfetch\(/);assert.match(css,/height:390px/);assert.match(css,/height:370px/)});
test('guest home keeps distinct sign-in and draft creation paths',()=>{assert.match(source,/!roomId&&configured&&!accountLoading&&!profile&&<><section className="wwm-guest-stage"/);assert.match(source,/<GuestCalendarPreview\/>/);assert.match(source,/<GoogleSignInButton[^>]*onClick=\{\(\)=>void login\(\)\}\/><Button ref=\{createTrigger\}/);assert.match(source,/>Create a room<\/Button>/);assert.match(source,/accountLoading&&<LoadingState label="Checking your account"/);assert.doesNotMatch(source,/Already have an account\?/)});
