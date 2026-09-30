// When We Meet dictionaries (src/i18n/locales/wwm/*.json) and a tiny translator.
// Values are plain strings with {placeholders}, or plural objects keyed by Intl.PluralRules categories.
import en from './locales/wwm/en.json' with {type:'json'};
import ko from './locales/wwm/ko.json' with {type:'json'};

export const WWM_LOCALES=Object.freeze(['en','ko']);
export const WWM_DEFAULT_LOCALE='en';
/** Shared with the blog's language switcher (localStorage) and readable on the server (cookie). */
export const LOCALE_COOKIE='NEXT_LOCALE';
const dictionaries={en,ko};

const supported=value=>WWM_LOCALES.find(locale=>typeof value==='string'&&value.toLowerCase().split(/[-_]/)[0]===locale);

/** Saved choice (cookie) wins, then the first supported Accept-Language entry by q, then English. */
export function resolveWwmLocale({cookie,acceptLanguage}={}){
 const saved=supported(cookie);if(saved)return saved;
 const ranked=(acceptLanguage||'').split(',').map((part,index)=>{const [tag,...params]=part.trim().split(';');const q=params.map(p=>p.trim()).find(p=>p.startsWith('q='));return {tag,q:q?Number(q.slice(2)):1,index}}).filter(entry=>entry.tag).sort((a,b)=>b.q-a.q||a.index-b.index);
 for(const entry of ranked){const match=supported(entry.tag);if(match)return match}
 return WWM_DEFAULT_LOCALE;
}

const lookup=(dictionary,key)=>key.split('.').reduce((node,part)=>node&&typeof node==='object'?node[part]:undefined,dictionary);
const isPlural=value=>value&&typeof value==='object'&&typeof value.other==='string';

/** t(key, vars): throws on unknown keys and missing placeholder values so gaps surface in tests, not in the UI. */
export function createWwmTranslator(locale){
 const lang=WWM_LOCALES.includes(locale)?locale:WWM_DEFAULT_LOCALE;
 const dictionary=dictionaries[lang],rules=new Intl.PluralRules(lang);
 return function t(key,vars={}){
  let value=lookup(dictionary,key);
  if(value===undefined)throw new Error(`Missing ${lang} translation: ${key}`);
  if(isPlural(value)){if(typeof vars.count!=='number')throw new Error(`${key} needs a numeric count`);value=value[rules.select(vars.count)]??value.other}
  if(typeof value!=='string')throw new Error(`${key} is not a leaf`);
  return value.replace(/\{([a-zA-Z]+)\}/g,(_,name)=>{if(!(name in vars))throw new Error(`${key} is missing {${name}}`);return String(vars[name])});
 };
}
