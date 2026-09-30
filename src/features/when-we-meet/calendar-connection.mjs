import {randomBytes,createHash,createHmac,createCipheriv,createDecipheriv,timingSafeEqual} from 'node:crypto';
export const CALENDAR_SCOPE='https://www.googleapis.com/auth/calendar.events.owned';
export const FREEBUSY_SCOPE='https://www.googleapis.com/auth/calendar.events.freebusy';
const b64=value=>Buffer.from(value).toString('base64url');
function secret(key){const bytes=Buffer.from(key||'','base64url');if(bytes.length!==32)throw Error('Calendar encryption key must be 32 bytes');return bytes;}
function mac(payload,key){return createHmac('sha256',secret(key)).update(payload).digest('base64url');}
export function safeRoomReturn(roomId,path){const base=`/craft/when-we-meet/${roomId}`;return typeof path==='string'&&(path===base||path.startsWith(base+'?'))?path:base;}
export function createConnection({roomId,userId,key,origin,nonce,now=Date.now(),clientId='configured-client'}){
 secret(key);if(!/^https:\/\//.test(origin)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))throw Error('Invalid OAuth origin');
 const verifier=randomBytes(32).toString('base64url');const challenge=createHash('sha256').update(verifier).digest('base64url');
 const payload=b64(JSON.stringify({roomId,userId,nonceHash:createHash('sha256').update(nonce).digest('base64url'),challenge,issued:now,jti:randomBytes(24).toString('base64url')}));
 const state=`${payload}.${mac(payload,key)}`;
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
 for(const [k,v] of Object.entries({client_id:clientId,redirect_uri:`${origin}/api/craft/when-we-meet/calendar/callback`,response_type:'code',scope:`openid email ${CALENDAR_SCOPE}`,access_type:'offline',prompt:'consent',state,code_challenge:challenge,code_challenge_method:'S256'}))url.searchParams.set(k,v);
 return {state,verifier,authorizationUrl:url.toString()};
}
export function consumeConnection({state,key,roomId,userId,nonce,now=Date.now()}){
 if(typeof state!=='string'||state.length>2048)throw Error('Invalid OAuth state');
 const [payload,signature,...extra]=state.split('.');if(!payload||!signature||extra.length)throw Error('Invalid OAuth state');
 const expected=Buffer.from(mac(payload,key));const actual=Buffer.from(signature);
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('Invalid OAuth state');
 const data=JSON.parse(Buffer.from(payload,'base64url').toString());
 if(data.roomId!==roomId||data.userId!==userId||data.nonceHash!==createHash('sha256').update(nonce).digest('base64url')||!Number.isSafeInteger(data.issued)||now<data.issued||now-data.issued>600000||typeof data.challenge!=='string')throw Error('Expired or mismatched OAuth state');
 return data;
}
export function validateCalendarGrant(user,identity,scope){
 const google=user?.identities?.find(item=>item.provider==='google');
 if(!google?.id||google.id!==identity?.sub||!user.email_confirmed_at||!identity.email_verified||typeof identity.email!=='string'||identity.email.toLowerCase()!==user.email?.toLowerCase())throw Error('Wrong Google account');
 if(typeof scope!=='string'||!scope.split(/\s+/).includes(CALENDAR_SCOPE))throw Error('Calendar permission missing');
 return true;
}
export function encryptCredential(value,key,context){const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',secret(key),iv);cipher.setAAD(Buffer.from(context));const ciphertext=Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]);return [b64(iv),b64(ciphertext),b64(cipher.getAuthTag())].join('.');}
export function decryptCredential(value,key,context){const [nonce,body,tag,...extra]=value.split('.');if(extra.length||!tag)throw Error('Invalid credential');const decipher=createDecipheriv('aes-256-gcm',secret(key),Buffer.from(nonce,'base64url'));decipher.setAAD(Buffer.from(context));decipher.setAuthTag(Buffer.from(tag,'base64url'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(body,'base64url')),decipher.final()]).toString());}
