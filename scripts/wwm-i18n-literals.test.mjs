// When We Meet UI copy comes from src/i18n/locales/wwm/*.json. This guard parses every migrated TSX file and fails on
// user-facing English written inline: JSX text, user-facing string attributes and toast messages must be expressions
// (t('…') or a copy helper). It also checks that every literal t('key') used by the UI exists in the dictionaries.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
import ts from 'typescript';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
function walk(dir){return readdirSync(new URL(dir,root)).flatMap(name=>{const path=`${dir}/${name}`;return statSync(new URL(path,root)).isDirectory()?walk(path):[path]})}
const files=[...walk('src/features/when-we-meet'),...walk('src/app/craft/when-we-meet')].filter(path=>path.endsWith('.tsx'));
const mjs=walk('src/features/when-we-meet').filter(path=>path.endsWith('.mjs'));

// Attributes a person reads or hears. data-analytics-* and ids stay constant English by design.
const USER_FACING=new Set(['aria-label','aria-description','aria-valuetext','placeholder','title','alt','label','description','rangeLabel','hint','pendingLabel','closeLabel']);
// Explicit, small allowlist: symbols and names that are the same in every language.
const ALLOWED=new Set(['—','–','·','↺','*']);
const hasWords=text=>/[A-Za-z]{2,}/.test(text);

function violations(path){
 const source=ts.createSourceFile(path,read(path),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const found=[];
 const where=node=>`${path}:${source.getLineAndCharacterOfPosition(node.getStart()).line+1}`;
 function visit(node){
  if(ts.isJsxText(node)){const text=node.getText().trim();if(text&&!ALLOWED.has(text)&&hasWords(text))found.push(`${where(node)} JSX text "${text}"`)}
  if(ts.isJsxAttribute(node)){
   const name=node.name.getText(),value=node.initializer;
   const literal=value&&(ts.isStringLiteral(value)?value.text:ts.isJsxExpression(value)&&value.expression&&(ts.isStringLiteral(value.expression)||ts.isNoSubstitutionTemplateLiteral(value.expression))?value.expression.text:null);
   if(USER_FACING.has(name)&&literal&&hasWords(literal))found.push(`${where(node)} ${name}="${literal}"`);
  }
  if(ts.isCallExpression(node)&&/^toast(\.(success|error|info|warning))?$/.test(node.expression.getText())){
   const first=node.arguments[0];
   if(first&&(ts.isStringLiteral(first)||ts.isNoSubstitutionTemplateLiteral(first)||ts.isTemplateExpression(first))&&hasWords(first.getText()))found.push(`${where(node)} toast ${first.getText()}`);
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
 return found;
}

test('migrated When We Meet TSX has no inline user-facing English',()=>{
 assert.ok(files.length>=25,`expected the When We Meet components, found ${files.length}`);
 assert.deepEqual(files.flatMap(violations),[]);
});

test('the guard itself catches inline copy',()=>{
 const sample='const A=()=><div aria-label="Close panel" title={`Fill slots`}><p>Hello there</p>{toast.success(\'Saved it\')}<span>—</span><b>{t(\'common.save\')}</b></div>;';
 const source=ts.createSourceFile('sample.tsx',sample,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const kinds=[];(function visit(node){if(ts.isJsxText(node)&&hasWords(node.getText()))kinds.push('text');if(ts.isJsxAttribute(node)&&USER_FACING.has(node.name.getText()))kinds.push(node.name.getText());ts.forEachChild(node,visit)})(source);
 assert.deepEqual(kinds,['aria-label','title','text']);
});

const dictionary=locale=>JSON.parse(read(`src/i18n/locales/wwm/${locale}.json`));
const lookup=(node,key)=>key.split('.').reduce((value,part)=>value&&typeof value==='object'?value[part]:undefined,node);
test('every literal t(\'key\') in the UI and its helpers exists in both dictionaries',()=>{
 const en=dictionary('en'),ko=dictionary('ko'),missing=[];
 for(const path of [...files,...mjs,'src/app/craft/CraftAccount.tsx']){
  for(const [,key] of read(path).matchAll(/\bt\('([a-zA-Z]+(?:\.[a-zA-Z]+)+)'/g)){
   for(const [locale,dict] of [['en',en],['ko',ko]])if(lookup(dict,key)===undefined)missing.push(`${path}: ${locale} ${key}`);
  }
 }
 assert.deepEqual(missing,[]);
});
