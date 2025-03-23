import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 요청 URL 경로 가져오기
  const pathname = request.nextUrl.pathname;

  // 공개 파일이나 API 요청에 대해서는 middleware를 적용하지 않음
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('/.') ||
    pathname.startsWith('/static')
  ) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 모든 경로에 대해 매칭 (단, _next, api, 정적 파일 제외)
    '/((?!_next|api|static|.*\\..*|_vercel|favicon.ico).*)',
  ],
};
