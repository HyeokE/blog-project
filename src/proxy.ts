import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {createServerClient} from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if(!pathname.startsWith('/craft')&&!pathname.startsWith('/api/craft'))return NextResponse.next();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.next();
  let response=NextResponse.next({request});
  // Tailscale terminates HTTPS before forwarding to the local HTTP server.
  // Only the explicitly approved Tailnet host may override the upstream scheme.
  const forwardedHost=request.headers.get('x-forwarded-host')||request.headers.get('host');
  const secure=request.nextUrl.protocol==='https:'||forwardedHost==='macmini-home.taile6a871.ts.net:8446'||forwardedHost==='macmini-home.taile6a871.ts.net';
  const client=createServerClient(url,key,{cookies:{
    getAll(){return request.cookies.getAll()},
    setAll(values){
      for(const {name,value} of values)request.cookies.set(name,value);
      response=NextResponse.next({request});
      for(const {name,value,options} of values)response.cookies.set(name,value,{...options,httpOnly:true,secure,sameSite:'lax',path:'/'});
      response.headers.set('Cache-Control','private, no-store');
    }
  }});
  // Verifies the session and refreshes expiring credentials before RSC reads.
  await client.auth.getUser();
  return response;
}

export const config = {
  matcher: [
    '/((?!_next|static|.*\\..*|_vercel|favicon.ico).*)',
  ],
};
