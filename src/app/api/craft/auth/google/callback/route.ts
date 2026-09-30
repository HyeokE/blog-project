import {cookies} from 'next/headers';
import {serverSupabaseClient} from '@/lib/supabase/server';
import {requestOrigin} from '@/lib/request-origin.mjs';
import {exchangeLoginCode,loginConfig,loginReturnPath,readLoginCallback,LOGIN_CALLBACK_PATH,LOGIN_FLOW_COOKIE} from '@/lib/google-login.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
// Google redirects here after the account chooser. Verifies state + flow cookie + PKCE, redeems the code,
// and hands Google's ID token (with the raw nonce) to Supabase on the writable cookie client, which sets
// the app session cookies. Google tokens are never stored. The one-time flow cookie is always cleared.
export async function GET(request:Request){
 const origin=requestOrigin(request.headers);
 const store=await cookies();const flowCookie=store.get(LOGIN_FLOW_COOKIE)?.value;
 store.set(LOGIN_FLOW_COOKIE,'',{httpOnly:true,secure:Boolean(origin?.startsWith('https:')),sameSite:'lax',path:LOGIN_CALLBACK_PATH,maxAge:0});
 const redirect=(path:string)=>new Response(null,{status:303,headers:{Location:new URL(path,origin??new URL(request.url).origin).toString(),'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 const params=new URL(request.url).searchParams;
 let config:ReturnType<typeof loginConfig>;
 try{if(!origin){throw Error('Unknown origin');}config=loginConfig(origin)}catch{return redirect(loginReturnPath(params.get('next'),'unavailable'))}
 const decision=readLoginCallback({params,cookie:flowCookie,key:config.stateKey});
 if(decision.outcome!=='exchange'){return redirect(loginReturnPath(decision.next,decision.outcome));}
 try{
  const tokens=await exchangeLoginCode(decision.code,decision.verifier,config);
  const client=await serverSupabaseClient();
  const {data,error}=await client.auth.signInWithIdToken({provider:'google',token:tokens.idToken,access_token:tokens.accessToken,nonce:decision.nonce});
  if(error||!data.session){throw Error(`Supabase rejected the Google ID token: ${error?.message??'no session'}`);}
  return redirect(loginReturnPath(decision.next,'signedIn'));
 }catch(error){
  console.warn('[craft] Google sign-in failed:',error instanceof Error?error.message:'unknown');
  return redirect(loginReturnPath(decision.next,'failed'));
 }
}
