'use client';

import { useRouter } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { locales, defaultLocale } from '@/i18n';
import { cn } from '@/components/Dock';

export function LanguageSwitcher() {
  const router = useRouter();
  const { locale } = useTranslation();

  const handleLanguageChange = (newLocale: string) => {
    // 현재 경로에서 언어 부분을 변경하여 새 경로 생성
    const currentPath = window.location.pathname;

    // 기본 로케일(한국어)로 변경하는 경우
    if (newLocale === defaultLocale) {
      // 현재 /en으로 시작하는 경로에서 한국어로 전환하는 경우
      if (currentPath.startsWith('/en')) {
        // /en 접두사 제거
        let newPath = currentPath.replace(/^\/en\/?/, '/');
        if (newPath === '') {
          newPath = '/';
        } // 빈 문자열이면 루트 경로로 변환
        router.push(newPath);
      }
      // 이미 루트 경로나 /ko가 아닌 경로에서는 아무것도 하지 않음
    }
    // 영어로 변경하는 경우
    else if (newLocale === 'en') {
      // 이미 /en으로 시작하는 경로인 경우 아무것도 하지 않음
      if (!currentPath.startsWith('/en')) {
        // 루트 경로인 경우
        if (currentPath === '/') {
          router.push('/en');
        }
        // 다른 경로인 경우
        else {
          router.push(`/en${currentPath}`);
        }
      }
    }
  };

  return (
    <div className="flex space-x-2">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => handleLanguageChange(l)}
          className={cn(
            'rounded-md px-3 py-1 text-sm',
            l === locale
              ? 'bg-gray-200 font-bold dark:bg-neutral-800'
              : 'bg-transparent hover:bg-gray-100 dark:hover:bg-neutral-900',
          )}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
