// Story plays query the UI by its English copy. This `within` keeps them working when the toolbar locale is Korean:
// a query string (or simple RegExp) that is an English dictionary value — exactly, or as a `{placeholder}` template —
// is rewritten to the same key's value in the active locale. Names that are data (e.g. "Team coffee") pass through.
import {within as baseWithin} from 'storybook/test';
import en from '@/i18n/locales/wwm/en.json';
import ko from '@/i18n/locales/wwm/ko.json';
import {createMeetingCopy} from '@/features/when-we-meet/meeting-copy.mjs';
import {clockLabel,dayLabel} from '@/features/when-we-meet/hour-label.mjs';

type Node={[key:string]:string|Node};
type Leaf={key:string;form?:string;en:string;ko:string};
const isPlural=(value:unknown):value is Record<string,string>=>Boolean(value)&&typeof value==='object'&&typeof (value as Record<string,unknown>).other==='string';
function leaves(enNode:Node,koNode:Node,prefix=''):Leaf[]{
 return Object.entries(enNode).flatMap(([key,value])=>{
  const other=koNode[key];
  if(typeof value==='string')return [{key:prefix+key,en:value,ko:String(other)}];
  if(isPlural(value))return Object.entries(value).map(([form,text])=>({key:prefix+key,form,en:text,ko:(other as Record<string,string>)[form]??(other as Record<string,string>).other}));
  return leaves(value,other as Node,`${prefix}${key}.`);
 });
}
const ALL=leaves(en as unknown as Node,ko as unknown as Node);
const literalOf=(template:string)=>template.replace(/\{[a-zA-Z]+\}/g,'\u0000');
// Only templates with real words around their placeholders ("Fill {count} slots"), never "{weekday} {day}".
const TEMPLATES=ALL.filter(leaf=>leaf.en.includes('{')&&(literalOf(leaf.en).match(/[A-Za-z]/g)||[]).length>=3);
/** The longest fixed piece of a Korean template, for substring matching ("{title}에 참여했어요" → "에 참여했어요"). */
const longestPiece=(template:string)=>literalOf(template).split('\u0000').map(piece=>piece.trim()).sort((a,b)=>b.length-a.length)[0]||'';
const escape=(text:string)=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const fill=(template:string,vars:Record<string,string>)=>template.replace(/\{([a-zA-Z]+)\}/g,(_,name)=>vars[name]??`{${name}}`);
/** English UI text → active-locale text; unknown text is returned unchanged. */
export function localize(text:string,locale=activeLocale()):string{
 if(locale==='en'||/[가-힣]/.test(text))return text;
 const exact=ALL.find(leaf=>leaf.en===text);
 if(exact)return exact.ko;
 for(const leaf of TEMPLATES){
  const names:string[]=[];
  const pattern=new RegExp(`^${escape(leaf.en).replace(/\\\{([a-zA-Z]+)\\\}/g,(_,name)=>{names.push(name);return '(.+?)'})}$`);
  const match=pattern.exec(text);
  if(match)return fill(leaf.ko,Object.fromEntries(names.map((name,i)=>[name,match[i+1]])));
 }
 return text;
}
function localizeMatcher<T>(value:T,locale:string):T{
 if(locale==='en')return value;
 if(typeof value==='string')return localize(value,locale) as T;
 if(value instanceof RegExp){
  // A plain-literal RegExp (e.g. /Saving/) matches the shortest English value containing it; anchors are kept.
  const literal=value.source.replace(/^\^|\$$/g,'');
  if(/[.*+?()[\]{}|\\]/.test(literal.replace(/\\./g,'')))return value;
  const plain=literal.replace(/\\(.)/g,'$1');
  const hit=ALL.filter(leaf=>!leaf.en.includes('{')&&leaf.en.includes(plain)).sort((a,b)=>a.en.length-b.en.length)[0];
  if(hit)return new RegExp(`${value.source.startsWith('^')?'^':''}${escape(hit.ko)}${value.source.endsWith('$')?'$':''}`,value.flags) as T;
  const template=TEMPLATES.find(leaf=>literalOf(leaf.en).split('\u0000').some(piece=>piece.includes(plain)));
  return template?new RegExp(escape(longestPiece(template.ko)),value.flags) as T:value;
 }
 return value;
}
/** Locale the When We Meet provider applied (Storybook toolbar `locale` global). */
export function activeLocale(){return typeof document==='undefined'?'en':document.documentElement.dataset.wwmLocale||'en'}

/** The provider's copy for the active locale, for expectations built from helpers (dates, chips). */
export const storyCopy=()=>createMeetingCopy(activeLocale());
/** A grid cell's accessible-name prefix: `Wed, Sep 30, 6:00 AM` / `9월 30일 (수) 오전 6:00`. */
export function cellWhen(date:string,time:string){const locale=activeLocale();return storyCopy().t('grid.when',{day:dayLabel(date,locale),time:clockLabel(time,locale)})}
/** RegExp for a grid cell whose name starts with that date and time. */
export const cellNamed=(date:string,time:string)=>new RegExp(`^${escape(cellWhen(date,time))},`);

/** Drop-in for storybook/test `within`, translating the text and `name` arguments of every query. */
export const within=((element:HTMLElement)=>{
 const queries=baseWithin(element);
 return new Proxy(queries,{get(target,property,receiver){
  const original=Reflect.get(target,property,receiver);
  if(typeof original!=='function'||typeof property!=='string'||!/^(get|query|find)(All)?By/.test(property))return original;
  return (matcher:unknown,options?:{name?:unknown},...rest:unknown[])=>{
   const locale=activeLocale();
   const next=options&&typeof options==='object'&&'name' in options?{...options,name:localizeMatcher(options.name,locale)}:options;
   return (original as (...args:unknown[])=>unknown)(localizeMatcher(matcher,locale),next,...rest);
  };
 }});
}) as typeof baseWithin;
