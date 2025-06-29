import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, defaultLocale, type Locale } from '@/i18n';

// 언어 감지 함수
function getLocaleFromRequest(request: NextRequest): Locale {
  // 1. URL에서 언어 추출
  const pathname = request.nextUrl.pathname;
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  if (!pathnameIsMissingLocale) {
    const locale = pathname.split('/')[1] as Locale;
    if (locales.includes(locale)) {
      return locale;
    }
  }

  // 2. 쿠키에서 저장된 언어 확인
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value as Locale;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // 3. Accept-Language 헤더에서 언어 감지
  const acceptLanguage = request.headers.get('Accept-Language');
  if (acceptLanguage) {
    const browserLang = acceptLanguage.split(',')[0].split('-')[0];
    if (browserLang === 'ko') {
      return 'ko';
    }
    if (browserLang === 'en') {
      return 'en';
    }
  }

  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 정적 파일이나 API 요청에 대해서는 middleware를 적용하지 않음
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('/.') ||
    pathname.startsWith('/static') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('/robots.txt') ||
    pathname.includes('/sitemap.xml')
  ) {
    return NextResponse.next();
  }

  // 이미 locale이 포함된 URL인지 확인
  const pathnameIsMissingLocale = locales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`,
  );

  // locale이 없는 경우 언어 감지 후 리다이렉트
  if (pathnameIsMissingLocale) {
    const locale = getLocaleFromRequest(request);

    // 홈페이지인 경우
    if (pathname === '/') {
      const url = new URL(`/${locale}`, request.url);
      const response = NextResponse.redirect(url);
      response.cookies.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365 });
      return response;
    }

    // 다른 페이지인 경우
    const url = new URL(`/${locale}${pathname}`, request.url);
    const response = NextResponse.redirect(url);
    response.cookies.set('NEXT_LOCALE', locale, { maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  // URL에서 현재 locale 추출
  const currentLocale = pathname.split('/')[1] as Locale;

  // 유효한 locale인지 확인
  if (locales.includes(currentLocale)) {
    // locale 쿠키 업데이트
    const response = NextResponse.next();
    response.cookies.set('NEXT_LOCALE', currentLocale, { maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  // 유효하지 않은 locale인 경우 기본 언어로 리다이렉트
  const url = new URL(`/${defaultLocale}${pathname}`, request.url);
  const response = NextResponse.redirect(url);
  response.cookies.set('NEXT_LOCALE', defaultLocale, { maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  matcher: [
    // 모든 경로에 대해 매칭 (단, _next, api, 정적 파일 제외)
    '/((?!_next|api|static|.*\\..*|_vercel|favicon.ico|robots.txt|sitemap.xml).*)',
  ],
};
