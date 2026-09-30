import {CALENDAR_SCOPE} from './calendar-connection.mjs';
const callbackPath='/api/craft/when-we-meet/calendar/callback';
export function calendarConfig(env=process.env){
 const clientId=env.GOOGLE_CALENDAR_CLIENT_ID,clientSecret=env.GOOGLE_CALENDAR_CLIENT_SECRET,redirectUri=env.GOOGLE_CALENDAR_REDIRECT_URI;
 const encryptionKey=env.WWM_CALENDAR_ENCRYPTION_KEY,stateKey=env.WWM_CALENDAR_STATE_KEY;
 if(!clientId||!clientSecret||!redirectUri||!encryptionKey||!stateKey||encryptionKey===stateKey||Buffer.from(encryptionKey,'base64url').length!==32||Buffer.from(stateKey,'base64url').length!==32)throw Error('Calendar configuration unavailable');
 const url=new URL(redirectUri);
 if(url.pathname!==callbackPath||url.search||url.hash||!(url.protocol==='https:'||(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname))))throw Error('Invalid Calendar redirect');
 return {clientId,clientSecret,redirectUri,origin:url.origin,encryptionKey,stateKey};
}
async function googleJSON(url,options,fetcher){
 const response=await fetcher(url,{...options,signal:AbortSignal.timeout(8000),cache:'no-store'});
 if(!response.ok)throw Error('Google authorization unavailable');
 return response.json();
}
export async function exchangeCalendarCode(code,verifier,config,fetcher=fetch){
 const body=new URLSearchParams({code,code_verifier:verifier,client_id:config.clientId,client_secret:config.clientSecret,redirect_uri:config.redirectUri,grant_type:'authorization_code'});
 const data=await googleJSON('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:body.toString()},fetcher);
 if(typeof data.refresh_token!=='string'||!data.refresh_token||typeof data.access_token!=='string'||!data.scope?.split(/\s+/).includes(CALENDAR_SCOPE))throw Error('Calendar permission incomplete');
 return data;
}
export async function fetchCalendarIdentity(accessToken,fetcher=fetch){
 const data=await googleJSON('https://openidconnect.googleapis.com/v1/userinfo',{headers:{Authorization:`Bearer ${accessToken}`}},fetcher);
 if(typeof data.sub!=='string'||typeof data.email!=='string'||data.email_verified!==true)throw Error('Google account unavailable');
 return data;
}
export function calendarStatus(row){return {connected:!!row,email:row?.googleEmail??null};}
export async function fetchGrantedScope(accessToken,fetcher=fetch){
 const data=await googleJSON(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,{},fetcher);
 if(typeof data.scope!=='string')throw Error('Google scope unavailable');
 return data.scope;
}
