import {createWwmTranslator} from '@/i18n/wwm.mjs';

const en=createWwmTranslator('en'),ko=createWwmTranslator('ko');
/** What "Copy invitation" puts on the clipboard: the English and Korean invitation lines, a blank line, then the link. */
export function inviteShareText(link:string,inviterName?:string|null){
 const name=inviterName?.trim().slice(0,40);
 const lines=name?[en('app.inviteShare',{name}),ko('app.inviteShare',{name})]:[en('app.inviteShareAnonymous'),ko('app.inviteShareAnonymous')];
 return `${lines.join('\n')}\n\n${link}`;
}
