import {cookies} from 'next/headers';
import {requestOrigin} from '@/lib/request-origin.mjs';
import {createLoginFlow,loginConfig,loginReturnPath,LOGIN_CALLBACK_PATH,LOGIN_FLOW_COOKIE,LOGIN_FLOW_TTL_SECONDS} from '@/lib/google-login.mjs';
export const dynamic='force-dynamic';export const runtime='nodejs';
// Ordinary sign-in: default scopes only (openid email profile), run directly against Google on our own domain.
// Calendar consent is a separate direct flow (/api/craft/when-we-meet/[roomId]/calendar/connect).
// The PKCE verifier, raw nonce and return path stay in an httpOnly cookie scoped to the callback path.
const redirect=(location:string)=>new Response(null,{status:303,headers:{Location:location,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function GET(request:Request){
 const url=new URL(request.url);const next=url.searchParams.get('next');
 const origin=requestOrigin(request.headers);
 let config:ReturnType<typeof loginConfig>;
 // Unregistered origins (Vercel previews, 127.0.0.1) cannot complete Google's redirect: say so instead of failing at Google.
 try{if(!origin){throw Error('Unknown origin');}config=loginConfig(origin)}
 catch{return redirect(new URL(loginReturnPath(next,'unavailable'),origin??url.origin).toString())}
 const flow=createLoginFlow({config,next,loginHint:url.searchParams.get('login_hint')??undefined});
 (await cookies()).set(LOGIN_FLOW_COOKIE,flow.cookie,{httpOnly:true,secure:origin.startsWith('https:'),sameSite:'lax',path:LOGIN_CALLBACK_PATH,maxAge:LOGIN_FLOW_TTL_SECONDS});
 return redirect(flow.authorizationUrl);
}
