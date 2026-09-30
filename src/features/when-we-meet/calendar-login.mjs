import {CALENDAR_SCOPE,FREEBUSY_SCOPE} from './calendar-connection.mjs';
export {CALENDAR_SCOPE,FREEBUSY_SCOPE};
export function validateCalendarGrant(user,identity,scope){
 const google=user?.identities?.find(item=>item.provider==='google');
 if(!google?.id||google.id!==identity?.sub||!user.email_confirmed_at||identity.email_verified!==true||typeof identity.email!=='string'||identity.email.toLowerCase()!==user.email?.toLowerCase())throw Error('Wrong Google account');
 if(typeof scope!=='string'||![CALENDAR_SCOPE,FREEBUSY_SCOPE].every(item=>scope.split(/\s+/).includes(item)))throw Error('Calendar permission missing');
 return true;
}
// The exchange client's cookie adapter MUST be staged: never flush its provider-bearing session.
// A fresh SSR client sets only the Supabase access/refresh pair after verification.
export async function createLoginExchange({client,createClient,persist,identity,scope}){
 const {data,error}=await client.auth.exchangeCodeForSession(identity?.code??'test-code');
 if(error||!data?.session||!data.user)throw Error('Could not complete Google login');
 const session=data.session;
 let calendar='not-ready';
 if(session.provider_refresh_token&&session.provider_token){
  try{
   const grant=await identity.fetchIdentity(session.provider_token);
   validateCalendarGrant(data.user,grant,scope??session.scope);
   await persist({userId:data.user.id,subject:grant.sub,email:grant.email,refreshToken:session.provider_refresh_token});
   calendar='connected';
  }catch{calendar='not-ready'}
 }
 const appClient=await createClient();
 const result=await appClient.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token});
 if(result.error||!result.data.session)throw Error(`Could not persist login: ${result.error?.message||'empty session'}`);
 return {authenticated:true,calendar};
}
