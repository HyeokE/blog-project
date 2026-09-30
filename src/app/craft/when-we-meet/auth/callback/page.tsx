'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useEffect,useRef,useState} from 'react';
import {safeReturnPath} from '@/features/when-we-meet/return-path.mjs';
import {completeCreateReturn} from '@/features/when-we-meet/draft.mjs';
import {restoreInviteReturn,clearInviteReturn} from '@/features/when-we-meet/invitation.mjs';
import {useWwmCopy} from '@/features/when-we-meet/i18n/WwmI18nProvider';
import './auth-callback.css';
// The server (/api/craft/auth/google/callback) has already set the session cookies, or failed with an error code.
// This page only restores tab-scoped drafts/invites from sessionStorage, which the server cannot read.
// Server error code → dictionary key.
const ERRORS:Record<string,string>={
  denied:'auth.cancelled',
  expired:'auth.expired',
  unavailable:'auth.unavailableHere',
  failed:'auth.failed',
};
export default function CallbackPage(){
  const {t}=useWwmCopy();
  const [error,setError]=useState('');
  const handled=useRef(false);
  useEffect(()=>{
    if(handled.current){return;}
    handled.current=true;
    const params=new URLSearchParams(window.location.search);
    const failure=params.get('error');
    if(failure||params.get('signedIn')!=='1'){clearInviteReturn(window.sessionStorage);setError(ERRORS[failure||'failed']||ERRORS.failed);return;}
    const next=safeReturnPath(params.get('next'));
    const destination=next==='/craft/when-we-meet'?(completeCreateReturn(window.sessionStorage,next),next):restoreInviteReturn(window.sessionStorage,next)||next;
    window.location.replace(destination);
  },[]);
  return <main className="craft-auth-return" aria-busy={!error} data-analytics-section={ANALYTICS_SECTIONS.WWM_AUTH}><h1>{error?t('auth.failedTitle'):t('auth.finishing')}</h1>{error?<><p role="alert">{t(error)}</p><a href="/craft/when-we-meet" data-analytics-label={ANALYTICS_ELEMENTS.AUTH_RETURN}>{t('auth.returnToMeetings')}</a></>:<><p role="status">{t('auth.restoring')}</p><div className="craft-auth-placeholder" aria-hidden="true"/></>}</main>;
}
