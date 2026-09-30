import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

// The page renders in the visitor's language (cookie or Accept-Language); the script reads names from the same dictionaries.
const browserPrelude=()=>{const dict=locale=>JSON.parse(readFileSync(new URL(`../src/i18n/locales/wwm/${locale}.json`,import.meta.url),'utf8'));return `const WWM_DICT=${JSON.stringify({en:dict('en'),ko:dict('ko')})};const DAY_PICKER=${JSON.stringify({en:{next:'Go to the Next Month',previous:'Go to the Previous Month'},ko:{next:'다음 달로 이동',previous:'이전 달로 이동'}})};\n`};

// An actual browser-frame test, not a source-string presence check.
test('shared range popup opens without frame flashes and restores focus across three Escape cycles',()=>{
 const script=readFileSync(new URL('./when-we-meet-motion.browser.mjs',import.meta.url),'utf8');
 const run=spawnSync('aside',['repl',browserPrelude()+script],{encoding:'utf8',timeout:120000});
 assert.equal(run.status,0,run.stderr||run.stdout);
 const match=run.stdout.match(/MOTION_RESULT (\{[^\n]+\})/);
 assert.ok(match,run.stdout);
 const result=JSON.parse(match[1]);
 assert.equal(result.cycles,3);
 assert.equal(result.frames.length,3);
 assert.ok(result.frames.every(frame=>frame.length>0),'Each cycle must sample real frames');
 console.log('MOTION_RESULT '+JSON.stringify(result));
 assert.deepEqual(result.failures,[],`Browser regression: ${result.failures.join('; ')} (${result.artifact})`);
},{timeout:130000});
