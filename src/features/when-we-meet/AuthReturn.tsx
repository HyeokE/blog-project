'use client';
import Link from 'next/link';
import {CircleAlert} from 'lucide-react';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import {Button} from '@/components/ui/button';
import {Spinner} from '@/components/ui/spinner';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import '../../app/craft/when-we-meet/auth/callback/auth-callback.css';

/** The screen shown between Google sign-in and the return to When We Meet: a short progress state, or the failure with one way back. */
export function AuthReturn({error}:{error?:string}){
 const {t}=useWwmCopy();
 return <main className="craft-auth-return" aria-busy={!error} data-analytics-section={ANALYTICS_SECTIONS.WWM_AUTH}>
  <div className="craft-auth-card" data-state={error?'error':'pending'}>
   {error?<CircleAlert className="craft-auth-icon" aria-hidden="true"/>:<Spinner className="craft-auth-icon"/>}
   <h1>{error?t('auth.failedTitle'):t('auth.finishing')}</h1>
   {error?<>
    <p role="alert">{t(error)}</p>
    <Button asChild variant="outline"><Link href="/craft/when-we-meet" data-analytics-label={ANALYTICS_ELEMENTS.AUTH_RETURN}>{t('auth.returnToMeetings')}</Link></Button>
   </>:<p role="status">{t('auth.restoring')}</p>}
  </div>
 </main>;
}
