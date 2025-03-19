import { useEffect, useState } from 'react';
import { getTranslations, defaultLocale, type Locale, locales } from '@/i18n';

type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<ReturnType<typeof getTranslations>>;

export function useTranslation() {
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    // 브라우저 환경에서만 실행
    if (typeof window !== 'undefined') {
      // 1. 쿠키에서 저장된 언어 설정 확인
      const savedLocale = localStorage.getItem('NEXT_LOCALE');

      // 2. 브라우저 언어 감지
      const browserLang = navigator.language || (navigator as any).userLanguage;
      const detectedLocale = browserLang?.startsWith('ko')
        ? 'ko'
        : browserLang?.startsWith('en')
          ? 'en'
          : defaultLocale;

      // 3. 우선순위: 쿠키에 저장된 설정 > 브라우저 언어 > 기본 언어
      const userLocale = (savedLocale as Locale) || detectedLocale;

      // 지원하는 언어인지 확인
      if (locales.includes(userLocale as Locale)) {
        setLocale(userLocale as Locale);
      } else {
        setLocale(defaultLocale);
      }
    }
  }, []);

  const translations = getTranslations(locale);

  const t = (key: TranslationKey) => {
    const keys = key.split('.');
    let translation: any = translations;

    for (const k of keys) {
      if (!translation[k]) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
      translation = translation[k];
    }

    return translation;
  };

  // 언어 변경 함수 추가
  const changeLocale = (newLocale: Locale) => {
    if (locales.includes(newLocale)) {
      localStorage.setItem('NEXT_LOCALE', newLocale);
      setLocale(newLocale);
    }
  };

  return {
    t,
    locale,
    translations,
    changeLocale,
  };
}
