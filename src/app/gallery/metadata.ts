import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { defaultLocale, getTranslations } from '@/i18n';

async function getBrowserLanguage(): Promise<string> {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];
  return ['ko', 'en'].includes(preferredLanguage) ? preferredLanguage : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getBrowserLanguage();
  const translations = getTranslations(lang as any);

  return {
    title: translations.gallery.meta.title,
    description: translations.gallery.meta.description,
    openGraph: {
      title: translations.gallery.meta.title,
      description: translations.gallery.meta.description,
    },
  };
}
