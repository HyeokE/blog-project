import { defaultLocale, getTranslations, locales } from '@/i18n';
import { cookies } from 'next/headers';
import { headers } from 'next/headers';

// 서버 컴포넌트에서 현재 로케일을 가져오는 함수
export async function getCurrentLocale(): Promise<string> {
  // URL에서 로케일 추출 시도 (미들웨어에서 처리되어야 하지만 폴백)
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '';

  const pathSegments = pathname.split('/').filter(Boolean);
  const possibleLocale = pathSegments[0];

  if (locales.includes(possibleLocale as any)) {
    return possibleLocale;
  }

  // 쿠키에서 로케일 가져오기
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('locale')?.value;

  if (savedLocale && locales.includes(savedLocale as any)) {
    return savedLocale;
  }

  // Accept-Language 헤더에서 로케일 가져오기
  const acceptLanguage = headersList.get('accept-language') || '';
  const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];

  if (locales.includes(preferredLanguage as any)) {
    return preferredLanguage;
  }

  return defaultLocale;
}

// 서버 컴포넌트에서 번역을 가져오는 함수
export async function getServerTranslations(locale?: string) {
  const currentLocale = locale || (await getCurrentLocale());
  return getTranslations(currentLocale as any);
}

// 메타데이터 생성을 위한 헬퍼 함수
export async function generateLocalizedMetadata(
  locale: string,
  titleKey: string,
  descriptionKey: string,
  additionalMeta: Record<string, any> = {},
) {
  const translations = getTranslations(locale as any);

  // 중첩된 키 접근을 위한 헬퍼 함수
  const getNestedValue = (obj: any, key: string): string => {
    const keys = key.split('.');
    let result = obj;
    for (const k of keys) {
      result = result?.[k];
    }
    return result || '';
  };

  const title = getNestedValue(translations, titleKey);
  const description = getNestedValue(translations, descriptionKey);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      locale,
      ...additionalMeta.openGraph,
    },
    alternates: {
      languages: locales.reduce(
        (acc, loc) => {
          acc[loc] = `/${loc}`;
          return acc;
        },
        {} as Record<string, string>,
      ),
      ...additionalMeta.alternates,
    },
    ...additionalMeta,
  };
}

// 로케일 유효성 검사
export function isValidLocale(locale: string): boolean {
  return locales.includes(locale as any);
}

// hreflang 태그 생성을 위한 헬퍼
export function generateHreflangLinks() {
  return locales.reduce(
    (acc, locale) => {
      acc[locale] = `/${locale}`;
      return acc;
    },
    {} as Record<string, string>,
  );
}
