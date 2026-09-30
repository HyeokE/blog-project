'use client';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';
import Link from 'next/link';
import {AlertCircle} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {GoogleSignInButton} from '@/components/craft/GoogleSignInButton';
import {Input} from '@/components/ui/input';
import {RequiredFieldLabel} from '@/components/craft/RequiredFieldLabel';
import './invitation.css';
import {LoadingState} from './LoadingState';
export function InvitationLanding({signedIn,loading,busy,valid,name,nameReady,onName,onSignIn,onJoin,onRetry,error}:{signedIn:boolean;loading:boolean;busy:boolean;valid:boolean;name:string;nameReady:boolean;onName:(name:string)=>void;onSignIn:()=>void;onJoin:()=>void;onRetry:()=>void;error:string}){
 return <section className="wwm-card wwm-invitation" aria-busy={busy||loading} data-analytics-section={ANALYTICS_SECTIONS.WWM_INVITATION}>
  <h2>Meeting invitation</h2>
  {!valid?<><p role="alert">This invitation link is incomplete or invalid. Ask the organizer for a new link.</p><Button asChild variant="outline"><Link href="/craft/when-we-meet" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_OPEN}>Go to your meetings</Link></Button></>:<><p>{signedIn?'Joining this meeting gives you access to its availability.':'Continue with Google to join this meeting and share your availability.'}</p>
  {(loading||busy)&&<LoadingState label={loading?"Checking your account":"Joining your meeting"} description={loading?"Getting your invitation ready.":"Preparing your availability calendar."}/>}
  {error&&<p className="wwm-invitation-error" role="alert"><AlertCircle aria-hidden="true"/><span>{error}</span></p>}
  {!loading&&signedIn&&<>{!busy&&!nameReady&&<div className="wwm-labeled-field"><RequiredFieldLabel required htmlFor="wwm-join-name">Your name</RequiredFieldLabel><Input id="wwm-join-name" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_NAME_INPUT} maxLength={50} required value={name} onChange={e=>onName(e.target.value)} autoComplete="name"/></div>}{!busy&&!error&&nameReady&&<LoadingState label="Joining your meeting" description="Preparing your availability calendar."/>}{!busy&&!error&&!nameReady&&<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_JOIN} onClick={onJoin} disabled={!name.trim()}>Join meeting</Button>}{!busy&&error&&<Button type="button" data-analytics-label={ANALYTICS_ELEMENTS.MEETING_JOIN} onClick={onRetry} disabled={!name.trim()}>Try joining again</Button>}</>}
  {!loading&&!signedIn&&<GoogleSignInButton data-analytics-label={ANALYTICS_ELEMENTS.SIGN_IN} onClick={onSignIn}/>}</>}
  <p className="wwm-invitation-note">Only people with the complete invitation link can join. Keep it private.</p>
 </section>
}
