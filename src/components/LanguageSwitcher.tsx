'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { locales } from '@/i18n';
import { cn } from '@/components/Dock';

export function LanguageSwitcher() {
  const { locale, changeLocale } = useTranslation();

  const handleLanguageChange = (newLocale: string) => {
    changeLocale(newLocale as 'ko' | 'en');
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
