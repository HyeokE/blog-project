import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const api=readFileSync(new URL('../src/features/when-we-meet/api.ts',import.meta.url),'utf8');
const constants=readFileSync(new URL('../src/constants/analytics.ts',import.meta.url),'utf8');
const operations=[...constants.match(/ANALYTICS_WWM_OPERATIONS = \{([\s\S]*?)\} as const/)[1].matchAll(/^\s+([A-Z_]+):/gm)].map(m=>m[1]);

test('every server-calling When We Meet API function reports a wwm_outcome',()=>{
 const exported=[...api.matchAll(/^export async function (\w+)/gm)].map(m=>m[1]).filter(name=>name!=='request');
 const unreported=exported.filter(name=>{const body=api.slice(api.indexOf(`export async function ${name}`)).split('\nexport ')[0];return !/outcome\(OP\./.test(body)&&!/trackEvent\(/.test(body)});
 assert.deepEqual(unreported,[]);
});

test('operations used by the API are the declared constants, each at least once',()=>{
 const used=new Set([...api.matchAll(/OP\.([A-Z_]+)/g)].map(m=>m[1]));
 for(const name of used)assert.ok(operations.includes(name),`${name} is not declared`);
});

test('outcome events carry no user content',()=>{
 const helper=api.match(/async function outcome[\s\S]*?\n/)[0];
 assert.doesNotMatch(helper,/message|name|title|email|slots\b|roomId|token/);
});
