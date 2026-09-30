import 'server-only';
import {cookies,headers} from 'next/headers';
import {LOCALE_COOKIE,resolveWwmLocale,type WwmLocale} from '@/i18n/wwm.mjs';

/** Request locale for When We Meet: saved NEXT_LOCALE cookie, then Accept-Language, then English. */
export async function getWwmLocale():Promise<WwmLocale>{
 const [store,head]=await Promise.all([cookies(),headers()]);
 return resolveWwmLocale({cookie:store.get(LOCALE_COOKIE)?.value,acceptLanguage:head.get('accept-language')});
}
