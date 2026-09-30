import {CALENDAR_SCOPE,CALENDAR_CALLBACK_PATH,isCalendarOrigin,consumeConnection,readConnectionRoom,decodeFlowCookie,calendarReturnPath,validateCalendarGrant,encryptCredential} from './calendar-connection.mjs';
const isKey=value=>typeof value==='string'&&Buffer.from(value,'base64url').length===32;
/** OAuth settings for the direct Calendar consent. The redirect is derived from the trusted request origin. */
export function calendarConfig(origin,env=process.env){
 const clientId=env.GOOGLE_CALENDAR_CLIENT_ID,clientSecret=env.GOOGLE_CALENDAR_CLIENT_SECRET;
 const encryptionKey=env.WWM_CALENDAR_ENCRYPTION_KEY,stateKey=env.WWM_CALENDAR_STATE_KEY;
 if(!clientId||!clientSecret||!isKey(encryptionKey)||!isKey(stateKey)||encryptionKey===stateKey)throw Error('Calendar configuration unavailable');
 if(!isCalendarOrigin(origin))throw Error('Invalid Calendar redirect');
 return {clientId,clientSecret,redirectUri:`${origin}${CALENDAR_CALLBACK_PATH}`,origin,encryptionKey,stateKey};
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

const CODE=/^[\w\-/.~]{8,2048}$/;
/**
 * Completes the consent callback. Returns the same-origin room path to redirect to; never applies or sends anything.
 * The credential is encrypted with the AAD `credential:${userId}:${subject}` that calendar-access.ts decrypts with.
 */
export async function completeCalendarConnection({params,cookie,user,config,store,now=Date.now(),fetcher=fetch}){
 const state=params.get('state');
 const flow=decodeFlowCookie(cookie);
 const target=readConnectionRoom(state,config.stateKey)??(flow?{roomId:flow.roomId,returnTo:undefined}:null);
 const back=outcome=>({outcome,location:calendarReturnPath(target?.roomId??null,target?.returnTo,outcome)});
 if(params.get('error'))return back(params.get('error')==='access_denied'?'denied':'error');
 try{
  if(!flow)throw Error('Calendar consent expired');
  if(!user?.id)throw Error('Not signed in');
  consumeConnection({state,key:config.stateKey,userId:user.id,nonce:flow.nonce,verifier:flow.verifier,now});
  const code=params.get('code');if(typeof code!=='string'||!CODE.test(code))throw Error('Invalid authorization code');
  const token=await exchangeCalendarCode(code,flow.verifier,config,fetcher);
  const identity=await fetchCalendarIdentity(token.access_token,fetcher);
  validateCalendarGrant(user,identity,token.scope);
  const cipher=encryptCredential({refresh_token:token.refresh_token},config.encryptionKey,`credential:${user.id}:${identity.sub}`);
  await store(user.id,identity.sub,identity.email,cipher);
  return back('connected');
 }catch(error){
  console.warn('[wwm] Calendar consent failed:',error instanceof Error?error.message:'unknown');
  return back('error');
 }
}
