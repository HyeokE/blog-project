'use client';
import {useEffect,useRef,useState} from 'react';
import {safeReturnPath} from '@/features/when-we-meet/return-path.mjs';
import {completeCreateReturn} from '@/features/when-we-meet/draft.mjs';
import {restoreInviteReturn,clearInviteReturn} from '@/features/when-we-meet/invitation.mjs';
import {AuthReturn} from '@/features/when-we-meet/AuthReturn';
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
  return <AuthReturn error={error||undefined}/>;
}
