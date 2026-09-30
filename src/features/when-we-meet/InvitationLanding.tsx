'use client';
import {Button} from '@/components/ui/button';
import {GoogleSignInButton} from '@/components/craft/GoogleSignInButton';
import {Input} from '@/components/ui/input';
import './invitation.css';
import {LoadingState} from './LoadingState';
export function InvitationLanding({signedIn,loading,busy,valid,name,nameReady,onName,onSignIn,onJoin,onRetry,error}:{signedIn:boolean;loading:boolean;busy:boolean;valid:boolean;name:string;nameReady:boolean;onName:(name:string)=>void;onSignIn:()=>void;onJoin:()=>void;onRetry:()=>void;error:string}){
 return <section className="wwm-card wwm-invitation" aria-busy={busy||loading}>
  <h2>Meeting invitation</h2>
  {!valid?<p role="alert">This invitation link is incomplete or invalid. Ask the organizer for a new link.</p>:<><p>{signedIn?'Joining this meeting gives you access to its availability.':'Continue with Google to join this meeting and share your availability.'}</p>
  {(loading||busy)&&<LoadingState label={loading?"Checking your account":"Joining your meeting"} description={loading?"Getting your invitation ready.":"Preparing your availability calendar."}/>}
  {error&&<p className="wwm-invitation-error" role="alert">{error}</p>}
  {!loading&&signedIn&&<>{!nameReady&&<label htmlFor="wwm-join-name">Your name<Input id="wwm-join-name" maxLength={50} required value={name} onChange={e=>onName(e.target.value)} autoComplete="name"/></label>}{!busy&&!error&&nameReady&&<LoadingState label="Joining your meeting" description="Preparing your availability calendar."/>}{!busy&&!error&&!nameReady&&<Button type="button" onClick={onJoin} disabled={!name.trim()}>Join meeting</Button>}{!busy&&error&&<Button type="button" onClick={onRetry} disabled={!name.trim()}>Try joining again</Button>}</>}
  {!loading&&!signedIn&&<GoogleSignInButton onClick={onSignIn}/>}</>}
  <p className="wwm-invitation-note">Only people with the complete invitation link can join. Keep it private.</p>
 </section>
}
