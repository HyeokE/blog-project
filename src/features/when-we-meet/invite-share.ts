import {createWwmTranslator,type WwmLocale} from '@/i18n/wwm.mjs';

const translators={en:createWwmTranslator('en'),ko:createWwmTranslator('ko')} as const;
/** What "Copy invitation" puts on the clipboard: the invitation sentence in the sharer's language, a blank line, then the link. */
export function inviteShareText(link:string,inviterName:string|null|undefined,locale:WwmLocale){
 const t=translators[locale]??translators.en,name=inviterName?.trim().slice(0,40);
 return `${name?t('app.inviteShare',{name}):t('app.inviteShareAnonymous')}\n\n${link}`;
}
