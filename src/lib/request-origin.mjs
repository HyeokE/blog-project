// Public origins this app answers on. Used for CSRF same-origin checks, OAuth return URLs
// and the Secure cookie flag, so every deployment (local, Tailnet, Vercel) agrees on one list.
const TAILNET_HOST='macmini-home.taile6a871.ts.net';
const TAILNET_ORIGIN=`https://${TAILNET_HOST}:8446`;

export function trustedOrigins(env=process.env){
 const origins=[TAILNET_ORIGIN,'http://localhost:3002','http://127.0.0.1:3002'];
 if(env.NEXT_PUBLIC_SITE_URL)origins.push(new URL(env.NEXT_PUBLIC_SITE_URL).origin);
 // Vercel injects bare hostnames for the deployment, its branch alias and the production domain.
 for(const host of [env.VERCEL_URL,env.VERCEL_BRANCH_URL,env.VERCEL_PROJECT_PRODUCTION_URL])if(host)origins.push(`https://${host}`);
 return [...new Set(origins)];
}

/** The trusted public origin a request arrived on, or null for an unknown host. */
export function requestOrigin(headers,env=process.env){
 const host=headers.get('x-forwarded-host')||headers.get('host')||'';
 // Tailscale Serve forwards the bare tailnet hostname for the :8446 listener.
 if(host===TAILNET_HOST)return TAILNET_ORIGIN;
 return trustedOrigins(env).find(origin=>new URL(origin).host===host)??null;
}

export function isSameOrigin(headers,env=process.env){
 const expected=requestOrigin(headers,env);
 return Boolean(expected&&headers.get('origin')===expected);
}
