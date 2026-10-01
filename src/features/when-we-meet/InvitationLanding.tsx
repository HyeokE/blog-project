'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import Link from 'next/link';
import {Skeleton} from '@/components/ui/skeleton';
import {Notice} from './Notice';
import {useWwmCopy} from './i18n/WwmI18nProvider';
import type {InvitationPreview} from './api';
import {Button} from '@/components/ui/button';
import {GoogleSignInButton} from '@/components/craft/GoogleSignInButton';
import {Input} from '@/components/ui/input';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import './invitation.css';
import {LoadingState} from './LoadingState';
import {ButtonSkeleton} from './ServerSkeletons';
/** `preview` is the token-gated context (title, dates, timezone, organizer) read before sign-in: undefined while loading, null when the link matches no meeting, 'unavailable' when it could not be read (joining still works). */
export function InvitationLanding({signedIn,loading,busy,valid,name,nameReady,onName,onSignIn,onJoin,onRetry,error,preview}:{signedIn:boolean;loading:boolean;busy:boolean;valid:boolean;name:string;nameReady:boolean;onName:(name:string)=>void;onSignIn:()=>void;onJoin:()=>void;onRetry:()=>void;error:string;preview?:InvitationPreview|null|'unavailable'}){
 const {t,compactRange,organizedBy}=useWwmCopy();
 const usable=valid&&preview!==null;
 return <section className="wwm-card wwm-invitation" aria-busy={busy||loading} data-analytics-section={ANALYTICS_SECTIONS.WWM_INVITATION}>
  <p className="wwm-invitation-eyebrow">{t('invitation.heading')}</p>
  {valid&&preview===undefined?<div className="wwm-invitation-context" role="status" aria-label={t('invitation.loading')}><Skeleton className="wwm-invitation-title-skeleton"/><Skeleton className="wwm-invitation-meta-skeleton"/></div>
  :usable&&preview&&preview!=='unavailable'?<div className="wwm-invitation-context"><h2>{preview.title}</h2><p className="wwm-invitation-meta">{compactRange(preview.startDate,preview.endDate)} · {preview.timezone}</p>{preview.organizerName&&<p className="wwm-invitation-meta">{organizedBy(preview.organizerName)}</p>}</div>
  :<h2>{t('invitation.heading')}</h2>}
  {!usable?<><p role="alert">{t('invitation.invalid')}</p><Button asChild variant="outline"><Link href="/craft/when-we-meet" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_OPEN}>{t('invitation.goToMeetings')}</Link></Button></>:<><p>{signedIn?t('invitation.memberBody'):t('invitation.guestBody')}</p>
  {loading&&<ButtonSkeleton label={t('list.checkingAccount')}/>}{!loading&&busy&&<LoadingState label={t('invitation.joining')} description={t('invitation.preparing')}/>}
  {error&&<Notice tone="error">{error}</Notice>}
  {!loading&&signedIn&&<>{!busy&&!nameReady&&<div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-join-name">{t('common.yourName')}</RequiredFieldLabel><Input id="wwm-join-name" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NAME_INPUT} maxLength={50} required value={name} onChange={e=>onName(e.target.value)} autoComplete="name"/></div>}{!busy&&!error&&nameReady&&<LoadingState label={t('invitation.joining')} description={t('invitation.preparing')}/>}{!busy&&!error&&!nameReady&&<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_JOIN} onClick={onJoin} disabled={!name.trim()}>{t('invitation.join')}</Button>}{!busy&&error&&<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_JOIN} onClick={onRetry} disabled={!name.trim()}>{t('invitation.retry')}</Button>}</>}
  {!loading&&!signedIn&&<GoogleSignInButton data-analytics-label={ANALYTICS_ELEMENTS.SIGN_IN} label={t('common.continueWithGoogle')} pendingLabel={t('common.connectingToGoogle')} onClick={onSignIn}/>}</>}
  <p className="wwm-invitation-note">{t('invitation.privacyNote')}</p>
 </section>
}
