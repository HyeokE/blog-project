import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Toss-style Korean UX writing rules (docs/wwm-ko-writing.md) for the When We Meet dictionary.
const ko=JSON.parse(readFileSync(new URL('../src/i18n/locales/wwm/ko.json',import.meta.url),'utf8'));
const strings=[];
(function walk(node,path){for(const [key,value] of Object.entries(node)){if(typeof value==='string')strings.push([`${path}${key}`,value]);else walk(value,`${path}${key}.`)}})(ko,'');

const banned=[
 [/습니다|습니까/,'use 해요체, not 합쇼체'],
 [/하시겠/,'ask with "~할까요?"'],
 [/!/,'no exclamation marks'],
 [/슬롯|블록/,'a half-hour cell is "칸"'],
 [/미팅|방장|관리자/,'say "모임" / "주최자"'],
 [/구글/,'write "Google"'],
 [/오류가 발생/,'say what happened and what to do next'],
 [/되었습니다|되었어요|생성/,'say what the user did ("만들었어요")'],
 [/(줌|함|됨|없음)$/,'no memo-style endings ("알려줌"); use 해요체 ("입력했어요")'],
];
// The chat invitation preview is the owner's own wording (with the exclamation mark); it is link-preview text, not UI copy.
const owned=new Set(['app.inviteShare','app.inviteShareAnonymous']);
test('Korean copy follows the Toss-style writing rules',()=>{
 for(const [key,text] of strings)for(const [pattern,rule] of banned)if(!(owned.has(key)&&rule.includes('exclamation')))assert.doesNotMatch(text,pattern,`${key}: ${rule} — "${text}"`);
});
test('Korean questions end with ~할까요?',()=>{
 for(const [key,text] of strings)if(text.endsWith('?'))assert.match(text,/까요\?$/,`${key}: "${text}"`);
});
