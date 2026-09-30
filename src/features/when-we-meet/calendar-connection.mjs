import {randomBytes,createHash,createHmac,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
export const CALENDAR_SCOPE='https://www.googleapis.com/auth/calendar.events.owned';
/** Our own callback for the direct Google Calendar consent (registered per origin in Google Cloud). */
export const CALENDAR_CALLBACK_PATH='/api/craft/when-we-meet/calendar/callback';
/** httpOnly cookie holding the PKCE verifier and browser nonce for one consent round trip. */
export const CALENDAR_FLOW_COOKIE='wwm_calendar_oauth';
const STATE_TTL_MS=600000;
const ROOM=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN=/^[\w-]{20,128}$/;
const OUTCOMES=new Set(['connected','denied','error']);
const b64=value=>Buffer.from(value).toString('base64url');
const sha256=value=>createHash('sha256').update(value).digest('base64url');
function secret(key){const bytes=Buffer.from(key||'','base64url');if(bytes.length!==32)throw Error('Calendar encryption key must be 32 bytes');return bytes;}
function mac(payload,key){return createHmac('sha256',secret(key)).update(payload).digest('base64url');}
export function safeRoomReturn(roomId,path){const base=`/craft/when-we-meet/${roomId}`;return typeof path==='string'&&(path===base||path.startsWith(base+'?'))?path:base;}
export function isCalendarOrigin(origin){return typeof origin==='string'&&(/^https:\/\/[^/?#]+$/.test(origin)||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));}

/** Starts the direct Google consent: PKCE S256 plus an HMAC-signed, expiring state bound to room, user and browser nonce. */
export function createConnection({roomId,userId,key,origin,nonce,now=Date.now(),clientId,loginHint,returnTo}){
 secret(key);if(!isCalendarOrigin(origin))throw Error('Invalid OAuth origin');
 if(!ROOM.test(roomId)||typeof userId!=='string'||!userId||typeof nonce!=='string'||!nonce||typeof clientId!=='string'||!clientId)throw Error('Invalid OAuth request');
 const verifier=randomBytes(32).toString('base64url');const challenge=sha256(verifier);
 const payload=b64(JSON.stringify({roomId,userId,returnTo:safeRoomReturn(roomId,returnTo),nonceHash:sha256(nonce),challenge,issued:now,jti:randomBytes(24).toString('base64url')}));
 const state=`${payload}.${mac(payload,key)}`;
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 const params={client_id:clientId,redirect_uri:`${origin}${CALENDAR_CALLBACK_PATH}`,response_type:'code',scope:`openid email ${CALENDAR_SCOPE}`,access_type:'offline',prompt:'consent',include_granted_scopes:'true',state,code_challenge:challenge,code_challenge_method:'S256'};
 if(typeof loginHint==='string'&&loginHint)params.login_hint=loginHint;
 for(const [k,v] of Object.entries(params))url.searchParams.set(k,v);
 return {state,verifier,authorizationUrl:url.toString()};
}
function verifiedPayload(state,key){
 if(typeof state!=='string'||state.length>2048)throw Error('Invalid OAuth state');
 const [payload,signature,...extra]=state.split('.');if(!payload||!signature||extra.length)throw Error('Invalid OAuth state');
 const expected=Buffer.from(mac(payload,key));const actual=Buffer.from(signature);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Invalid OAuth state');
 const data=JSON.parse(Buffer.from(payload,'base64url').toString());
 if(!data||!ROOM.test(data.roomId))throw Error('Invalid OAuth state');
 return data;
}
/** Room and return path from a validly signed state, for routing the browser back even when the flow failed. */
export function readConnectionRoom(state,key){try{const data=verifiedPayload(state,key);return {roomId:data.roomId,returnTo:safeRoomReturn(data.roomId,data.returnTo)}}catch{return null}}
/** Verifies signature, expiry, user, browser nonce and that the cookie's verifier matches the signed PKCE challenge. */
export function consumeConnection({state,key,roomId,userId,nonce,verifier,now=Date.now()}){
 const data=verifiedPayload(state,key);
 if((roomId!==undefined&&data.roomId!==roomId)||typeof userId!=='string'||data.userId!==userId||typeof nonce!=='string'||data.nonceHash!==sha256(nonce)||typeof verifier!=='string'||typeof data.challenge!=='string'||data.challenge!==sha256(verifier)||!Number.isSafeInteger(data.issued)||now<data.issued||now-data.issued>STATE_TTL_MS)throw Error('Expired or mismatched OAuth state');
 return {...data,returnTo:safeRoomReturn(data.roomId,data.returnTo)};
}
export function encodeFlowCookie({nonce,verifier,roomId}){return b64(JSON.stringify({nonce,verifier,roomId}));}
export function decodeFlowCookie(value){
 try{if(typeof value!=='string'||value.length>1024)return null;const data=JSON.parse(Buffer.from(value,'base64url').toString());
  return data&&TOKEN.test(data.nonce)&&TOKEN.test(data.verifier)&&ROOM.test(data.roomId)?{nonce:data.nonce,verifier:data.verifier,roomId:data.roomId}:null;}catch{return null}
}
/** Same-origin room path (never external) with a single `calendar=<outcome>` flag for the UI to announce. */
export function calendarReturnPath(roomId,returnTo,outcome){
 const flag=OUTCOMES.has(outcome)?outcome:'error';
 const url=new URL(ROOM.test(roomId??'')?safeRoomReturn(roomId,returnTo):'/craft/when-we-meet','https://app.invalid');
 url.searchParams.set('calendar',flag);
 return url.pathname+url.search;
}
export function validateCalendarGrant(user,identity,scope){
 const google=user?.identities?.find(item=>item.provider==='google');
 if(!google?.id||google.id!==identity?.sub||!user.email_confirmed_at||identity.email_verified!==true||typeof identity.email!=='string'||identity.email.toLowerCase()!==user.email?.toLowerCase())throw Error('Wrong Google account');
 if(typeof scope!=='string'||!scope.split(/\s+/).includes(CALENDAR_SCOPE))throw Error('Calendar permission missing');
 return true;
}
export function encryptCredential(value,key,context){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',secret(key),iv);cipher.setAAD(Buffer.from(context));const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return [b64(iv),b64(ciphertext),b64(cipher.getAuthTag())].join('.');}
export function decryptCredential(value,key,context){const [nonce,body,tag,...extra]=value.split('.');if(extra.length||!tag)throw Error('Invalid credential');const decipher=createDecipheriv('aes-256-gcm',secret(key),Buffer.from(nonce,'base64url'));decipher.setAAD(Buffer.from(context));decipher.setAuthTag(Buffer.from(tag,'base64url'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString());}
