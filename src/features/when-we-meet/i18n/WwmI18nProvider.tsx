'use client';
import {createContext,useContext,useEffect,useMemo,type ReactNode} from 'react';
import {createMeetingCopy,type MeetingCopy} from '../meeting-copy.mjs';
import {LOCALE_COOKIE,WWM_DEFAULT_LOCALE,type WwmLocale} from '@/i18n/wwm.mjs';

const Context=createContext<MeetingCopy>(createMeetingCopy(WWM_DEFAULT_LOCALE));

/** Locale is resolved on the server (cookie → Accept-Language → en) so the first paint is already translated. */
export function WwmI18nProvider({locale,children}:{locale:WwmLocale;children:React.ReactNode}){
 const copy=useMemo(()=>createMeetingCopy(locale),[locale]);
 // Child effects run before the Craft shell's: the data flag tells CraftAccount not to reset <html lang> to English.
 useEffect(()=>{const root=document.documentElement;root.dataset.wwmLocale=locale;root.lang=locale;return()=>{delete root.dataset.wwmLocale;if(root.dataset.craft)root.lang='en'}},[locale]);
 return <Context.Provider value={copy}>{children}</Context.Provider>;
}
/** `const {t, shortDay, MEETING_COPY} = useWwmCopy()` */
export const useWwmCopy=()=>useContext(Context);

/** Placeholder value for {vars} that `rich` swaps for a React node (e.g. a bolded title). */
export const RICH_SLOT='\uE000';
/**
 * Renders a translated sentence with one part replaced by a node, keeping word order per locale:
 * `rich(t('room.joined',{title:RICH_SLOT}),RICH_SLOT,<strong>{title}</strong>)`.
 * For plural counts pass the number itself as the token: `rich(t('room.selected',{count}),String(count),<RollingNumber/>)`.
 */
export function rich(text:string,token:string,node:ReactNode):ReactNode{
 const at=text.indexOf(token);
 if(at<0){return text;}
 return <>{text.slice(0,at)}{node}{text.slice(at+token.length)}</>;
}

/** Persist a language choice where both the server (cookie) and the blog switcher (localStorage) read it. */
export function saveWwmLocale(locale:WwmLocale){
 document.cookie=`${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
 try{localStorage.setItem(LOCALE_COOKIE,locale)}catch{/* private mode: the cookie still applies */}
}
