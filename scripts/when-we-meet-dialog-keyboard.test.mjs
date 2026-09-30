import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

test('nested Escape, draft reopen, placeholder and focus work in guest or authenticated browser',()=>{
 const script=readFileSync(new URL('./when-we-meet-dialog-keyboard.browser.mjs',import.meta.url),'utf8');
 const run=spawnSync('aside',['repl',script],{encoding:'utf8',timeout:120000});
 assert.equal(run.status,0,run.stderr||run.stdout);
 const match=run.stdout.match(/DIALOG_KEYBOARD_RESULT (\{[^\n]+\})/);
 assert.ok(match,run.stdout);
 const result=JSON.parse(match[1]);
 console.log('DIALOG_KEYBOARD_RESULT '+JSON.stringify(result));
 assert.deepEqual(result.failures,[],run.stdout);
},{timeout:130000});
