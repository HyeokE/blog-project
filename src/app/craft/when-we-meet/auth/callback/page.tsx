'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {useEffect,useRef,useState} from 'react';
import {safeReturnPath} from '@/features/when-we-meet/return-path.mjs';
import {completeCreateReturn} from '@/features/when-we-meet/draft.mjs';
import {restoreInviteReturn,clearInviteReturn} from '@/features/when-we-meet/invitation.mjs';
import './auth-callback.css';
// The server (/api/craft/auth/google/callback) has already set the session cookies, or failed with an error code.
// This page only restores tab-scoped drafts/invites from sessionStorage, which the server cannot read.
const ERRORS:Record<string,string>={
  denied:'Google sign-in was cancelled.',
  expired:'The sign-in attempt expired. Please try Google login again.',
  unavailable:'Google sign-in is not available on this address. Open hyeok.dev to sign in.',
  failed:'Could not complete Google sign-in. Please try again.',
};
export default function CallbackPage(){
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
  return <main className="craft-auth-return" aria-busy={!error} data-analytics-section={ANALYTICS_SECTIONS.WWM_AUTH}><h1>{error?'Google sign-in could not finish':'Finishing Google sign-in'}</h1>{error?<><p role="alert">{error}</p><a href="/craft/when-we-meet" data-analytics-label={ANALYTICS_ELEMENTS.AUTH_RETURN}>Return to meetings and try again</a></>:<><p role="status">Restoring your session and returning to your meeting. Your draft will remain in this tab.</p><div className="craft-auth-placeholder" aria-hidden="true"/></>}</main>;
}
