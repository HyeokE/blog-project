import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {requestOrigin} from '@/lib/request-origin.mjs';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if(!pathname.startsWith('/craft')&&!pathname.startsWith('/api/craft'))return NextResponse.next();
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.next();
  let response=NextResponse.next({request});
  // Tailscale terminates HTTPS before forwarding to the local HTTP server, so only a
  // trusted https origin (Tailnet, production, Vercel preview) may override the upstream scheme.
  const secure=request.nextUrl.protocol==='https:'||Boolean(requestOrigin(request.headers)?.startsWith('https:'));
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
