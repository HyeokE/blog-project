// Google sign-in run on our own domain: Google OAuth (code + PKCE + nonce) -> ID token -> Supabase signInWithIdToken.
// One Google Cloud OAuth client (GOOGLE_OAUTH_*) serves both sign-in and Calendar consent, and every redirect
// URI is on an origin we own, so Google verification never sees the Supabase project domain.
// Google access/refresh tokens from sign-in are never stored.
import {randomBytes,createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {safeReturnPath} from '../features/when-we-meet/return-path.mjs';

export const LOGIN_CALLBACK_PATH='/api/craft/auth/google/callback';
/** httpOnly cookie, scoped to LOGIN_CALLBACK_PATH, holding the PKCE verifier, raw nonce and return path. */
export const LOGIN_FLOW_COOKIE='craft_google_login';
export const LOGIN_FLOW_TTL_SECONDS=600;
/** Origins whose callback URIs are registered on the OAuth client. Vercel preview hosts are not. */
export const LOGIN_ORIGINS=Object.freeze(['https://hyeok.dev','https://macmini-home.taile6a871.ts.net:8446','http://localhost:3002']);
const OUTCOMES=new Set(['signedIn','denied','expired','failed','unavailable']);
const TOKEN=/^[\w-]{40,128}$/;
const CODE=/^[\w\-/.~]{8,2048}$/;
const EMAIL=/^[^\s@]{1,64}@[^\s@]{1,255}$/;
const sha256b64=value=>createHash('sha256').update(value).digest('base64url');
const sha256hex=value=>createHash('sha256').update(value).digest('hex');
const isKey=value=>typeof value==='string'&&Buffer.from(value,'base64url').length===32;
// Domain-separated so a Calendar consent state signed with the same key never verifies here.
const mac=(payload,key)=>createHmac('sha256',Buffer.from(key,'base64url')).update(`craft-login.${payload}`).digest('base64url');

/** The single Google OAuth client used for sign-in and Calendar. */
export function googleOAuthClient(env=process.env){
 const clientId=env.GOOGLE_OAUTH_CLIENT_ID,clientSecret=env.GOOGLE_OAUTH_CLIENT_SECRET;
 if(!clientId||!clientSecret)throw Error('Google OAuth client unavailable');
 return {clientId,clientSecret};
}
export function isLoginOrigin(origin){return LOGIN_ORIGINS.includes(origin);}
export function loginConfig(origin,env=process.env){
 if(!isLoginOrigin(origin))throw Error('Google sign-in is only registered for hyeok.dev');
 const stateKey=env.WWM_CALENDAR_STATE_KEY;if(!isKey(stateKey))throw Error('Sign-in state key unavailable');
 return {...googleOAuthClient(env),stateKey,origin,redirectUri:`${origin}${LOGIN_CALLBACK_PATH}`};
}

/** Builds Google's authorization URL plus the flow cookie value. State is HMAC-signed, expiring and bound to the cookie's verifier. */
export function createLoginFlow({config,next,loginHint,now=Date.now()}){
 const verifier=randomBytes(32).toString('base64url');const nonce=randomBytes(32).toString('base64url');
 const challenge=sha256b64(verifier);
 const payload=Buffer.from(JSON.stringify({challenge,issued:now,jti:randomBytes(16).toString('base64url')})).toString('base64url');
 const state=`${payload}.${mac(payload,config.stateKey)}`;
 const flow={verifier,nonce,next:safeReturnPath(next)};
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 // Supabase compares sha256(raw nonce) with the ID token's nonce claim, so Google receives the hex hash.
 const params={client_id:config.clientId,redirect_uri:config.redirectUri,response_type:'code',scope:'openid email profile',state,nonce:sha256hex(nonce),code_challenge:challenge,code_challenge_method:'S256',prompt:'select_account'};
 if(typeof loginHint==='string'&&EMAIL.test(loginHint))params.login_hint=loginHint;
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 return {authorizationUrl:url.toString(),cookie:Buffer.from(JSON.stringify(flow)).toString('base64url'),flow};
}
function decodeFlow(value){
 try{
  if(typeof value!=='string'||!value||value.length>1024)return null;
  const data=JSON.parse(Buffer.from(value,'base64url').toString());
  return data&&TOKEN.test(data.verifier)&&TOKEN.test(data.nonce)&&typeof data.next==='string'?{verifier:data.verifier,nonce:data.nonce,next:safeReturnPath(data.next)}:null;
 }catch{return null}
}
function verifiedState(state,key){
 if(typeof state!=='string'||state.length>1024)return null;
 const [payload,signature,...extra]=state.split('.');if(!payload||!signature||extra.length)return null;
 const expected=Buffer.from(mac(payload,key));const actual=Buffer.from(signature);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;
 try{return JSON.parse(Buffer.from(payload,'base64url').toString())}catch{return null}
}
/**
 * Pure decision for the Google callback. `exchange` carries what the route needs to redeem the code;
 * every other outcome is a redirect to the client page with that error code.
 */
export function readLoginCallback({params,cookie,key,now=Date.now()}){
 const flow=decodeFlow(cookie);const next=flow?.next??safeReturnPath(undefined);
 const error=params.get('error');
 if(error)return {outcome:error==='access_denied'?'denied':'failed',next};
 if(!flow)return {outcome:'expired',next};
 const data=verifiedState(params.get('state'),key);
 if(!data||data.challenge!==sha256b64(flow.verifier)||!Number.isSafeInteger(data.issued)||now<data.issued)return {outcome:'failed',next};
 if(now-data.issued>LOGIN_FLOW_TTL_SECONDS*1000)return {outcome:'expired',next};
 const code=params.get('code');if(typeof code!=='string'||!CODE.test(code))return {outcome:'failed',next};
 return {outcome:'exchange',code,verifier:flow.verifier,nonce:flow.nonce,next};
}
/** Same-origin client page that restores drafts/invites, then leaves for `next`. */
export function loginReturnPath(next,outcome){
 const url=new URL('/craft/when-we-meet/auth/callback','https://app.invalid');
 url.searchParams.set('next',safeReturnPath(next));
 if(outcome==='signedIn')url.searchParams.set('signedIn','1');
 else url.searchParams.set('error',OUTCOMES.has(outcome)?outcome:'failed');
 return url.pathname+url.search;
}
/** Redeems the code at Google. Only the ID token (and access token, for Supabase's at_hash check) leave this function. */
export async function exchangeLoginCode(code,verifier,config,fetcher=fetch){
 const body=new URLSearchParams({grant_type:'authorization_code',code,code_verifier:verifier,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri});
 const response=await fetcher('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString(),signal:AbortSignal.timeout(8000),cache:'no-store'});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(`Google token exchange failed: ${typeof data?.error==='string'?data.error:response.status}`);
 if(typeof data.id_token!=='string'||!data.id_token)throw Error('Google returned no ID token');
 return {idToken:data.id_token,accessToken:typeof data.access_token==='string'?data.access_token:undefined};
}
