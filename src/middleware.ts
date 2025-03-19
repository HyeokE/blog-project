import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/i18n';

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

  // 영어 경로인 경우 그대로 진행
  if (pathname.startsWith('/en')) {
    return NextResponse.next();
  }

  // 루트 경로인 경우 ko 컨텐츠를 보여줌 (기본 언어)
  // 다른 언어 접두사가 없는 모든 경로는 한국어 경로로 처리
  if (
    !pathname.startsWith('/ko') &&
    !locales.some((locale) => locale !== defaultLocale && pathname.startsWith(`/${locale}`))
  ) {
    // 경로가 /ko로 시작하지 않고, 다른 로케일로도 시작하지 않는 경우
    // URL은 그대로 유지하고 내부적으로는 /ko 경로의 컨텐츠를 처리

    // 여기서는 URL을 바꾸지 않고 내부적으로 defaultLocale(ko)를 사용하도록 처리
    const url = new URL(request.url);

    // 리다이렉트가 아닌 리라이트(rewrite)를 사용하여 URL은 그대로 두고 내용만 한국어 버전으로 제공
    return NextResponse.rewrite(new URL(`/ko${pathname === '/' ? '' : pathname}`, url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 모든 경로에 대해 매칭 (단, _next, api, 정적 파일 제외)
    '/((?!_next|api|static|.*\\..*|_vercel|favicon.ico).*)',
  ],
};
