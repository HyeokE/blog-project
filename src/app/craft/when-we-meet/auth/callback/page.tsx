'use client';
import {useEffect,useRef,useState} from 'react';
import {request} from '@/features/when-we-meet/api';
import {safeReturnPath} from '@/features/when-we-meet/return-path.mjs';
import {completeCreateReturn} from '@/features/when-we-meet/draft.mjs';
import {restoreInviteReturn,clearInviteReturn} from '@/features/when-we-meet/invitation.mjs';
import './auth-callback.css';
export default function CallbackPage(){
  const [error,setError]=useState('');
  const exchanging=useRef(false);
  useEffect(()=>{
    if(exchanging.current){return;}
    exchanging.current=true;
    const params=new URLSearchParams(window.location.search);
    const code=params.get('code');const oauthError=params.get('error_description')||params.get('error');
    if(oauthError){clearInviteReturn(window.sessionStorage);setError(oauthError);return;}
    if(!code){clearInviteReturn(window.sessionStorage);setError('Missing authorization code. Please try Google login again.');return;}
    let finished=false;
    const timeout=window.setTimeout(()=>{if(!finished){finished=true;setError('Sign-in is taking too long. Return to meetings and try again.');}},15000);
    request<{authenticated:boolean}>('/api/craft/auth/callback',{code}).then(result=>{
      if(finished){return;}
      finished=true;window.clearTimeout(timeout);
      if(!result.authenticated){setError('Could not complete Google sign-in. Please try again.');return;}
      const next=safeReturnPath(params.get('next'));
      const destination=next==='/craft/when-we-meet'?(completeCreateReturn(window.sessionStorage,next),next):restoreInviteReturn(window.sessionStorage,next)||next;
      window.location.replace(destination);
    }).catch(()=>{if(!finished){finished=true;window.clearTimeout(timeout);setError('Could not complete Google sign-in. Please try again.');}});
  },[]);
  return <main className="craft-auth-return" aria-busy={!error}><h1>{error?'Google sign-in could not finish':'Finishing Google sign-in'}</h1>{error?<><p role="alert">{error}</p><a href="/craft/when-we-meet">Return to meetings and try again</a></>:<><p role="status">Restoring your session and returning to your meeting. Your draft will remain in this tab.</p><div className="craft-auth-placeholder" aria-hidden="true"/></>}</main>;
}
