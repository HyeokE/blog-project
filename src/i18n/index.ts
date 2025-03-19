import en from './locales/en.json';
import ko from './locales/ko.json';

export const locales = ['en', 'ko'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'ko';

export const i18n = {
  en,
  ko,
} as const;

export function getTranslations(locale: Locale = defaultLocale) {
  return i18n[locale];
}
