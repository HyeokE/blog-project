export type WwmLocale='en'|'ko';
export const WWM_LOCALES:readonly WwmLocale[];
export const WWM_DEFAULT_LOCALE:WwmLocale;
export const LOCALE_COOKIE:string;
export function resolveWwmLocale(input?:{cookie?:string|null;acceptLanguage?:string|null}):WwmLocale;
export type WwmTranslate=(key:string,vars?:Record<string,string|number>)=>string;
export function createWwmTranslator(locale:string):WwmTranslate;
