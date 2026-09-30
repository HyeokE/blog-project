import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {WWM_LOCALES,resolveWwmLocale,createWwmTranslator} from '../src/i18n/wwm.mjs';

const load=locale=>JSON.parse(readFileSync(new URL(`../src/i18n/locales/wwm/${locale}.json`,import.meta.url),'utf8'));
const en=load('en'),ko=load('ko');
const isPlural=value=>value&&typeof value==='object'&&'other' in value&&Object.keys(value).every(k=>['zero','one','two','few','many','other'].includes(k));
function leaves(node,prefix=''){
 return Object.entries(node).flatMap(([key,value])=>isPlural(value)||typeof value==='string'?[[prefix+key,value]]:leaves(value,`${prefix}${key}.`));
}
const placeholders=value=>[...new Set(JSON.stringify(value).match(/\{[a-zA-Z]+\}/g)||[])].sort();

test('English and Korean dictionaries have exactly the same keys',()=>{
 assert.deepEqual(leaves(ko).map(([k])=>k).sort(),leaves(en).map(([k])=>k).sort());
});
test('every string is non-empty and placeholders match across locales',()=>{
 const koMap=new Map(leaves(ko));
 for(const [key,value] of leaves(en)){
  const other=koMap.get(key);
  for(const text of [value,other].flatMap(v=>typeof v==='string'?[v]:Object.values(v)))assert.ok(text.trim(),`${key} is empty`);
  assert.deepEqual(placeholders(other),placeholders(value),`${key} placeholders differ`);
 }
});
test('locale resolution: saved cookie, then Accept-Language, then English',()=>{
 assert.deepEqual([...WWM_LOCALES],['en','ko']);
 assert.equal(resolveWwmLocale({cookie:'ko',acceptLanguage:'en-US'}),'ko');
 assert.equal(resolveWwmLocale({cookie:'fr',acceptLanguage:'ko-KR,ko;q=0.9,en;q=0.8'}),'ko');
 assert.equal(resolveWwmLocale({acceptLanguage:'fr-FR,en;q=0.5'}),'en');
 assert.equal(resolveWwmLocale({acceptLanguage:'de-DE'}),'en');
 assert.equal(resolveWwmLocale({}),'en');
});
test('translator interpolates, pluralises and falls back to English for unknown locales',()=>{
 const t=createWwmTranslator('en'),k=createWwmTranslator('ko');
 assert.equal(t('create.readyTitle',{title:'Team coffee'}),'Team coffee is ready');
 assert.equal(t('fill.button',{count:1}),'Fill 1 slot');
 assert.equal(t('fill.button',{count:3}),'Fill 3 slots');
 assert.equal(k('fill.button',{count:3}),'3칸 채우기');
 assert.equal(t('grid.savedResponses',{count:1}),'1 saved response');
 assert.equal(createWwmTranslator('fr')('common.cancel'),'Cancel');
 assert.throws(()=>t('missing.key'),/missing\.key/);
 assert.throws(()=>t('create.readyTitle'),/title/,'missing placeholder values are reported, not printed');
});
test('Storybook drops JSON import attributes before the Next SWC plugin rewrites them to legacy `assert`',()=>{
 const main=readFileSync(new URL('../.storybook/main.ts',import.meta.url),'utf8');
 assert.match(main,/name:'wwm-json-import-attributes',enforce:'pre'/);
 assert.match(readFileSync(new URL('../src/i18n/wwm.mjs',import.meta.url),'utf8'),/from '\.\/locales\/wwm\/en\.json' with \{type:'json'\}/,'app code keeps the standard attribute Node needs');
});
