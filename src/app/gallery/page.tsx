import React from 'react';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { defaultLocale, getTranslations } from '@/i18n';
import GalleryPage from '@/container/gallery/GalleryPage';

async function getBrowserLanguage(): Promise<'ko' | 'en'> {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];
  return ['ko', 'en'].includes(preferredLanguage)
    ? (preferredLanguage as 'ko' | 'en')
    : defaultLocale;
}

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getBrowserLanguage();
  const translations = getTranslations(lang);

  return {
    title: translations.gallery.meta.title,
    description: translations.gallery.meta.description,
    openGraph: {
      title: translations.gallery.meta.title,
      description: translations.gallery.meta.description,
    },
  };
}

export default async function Page() {
  return <GalleryPage />;
}
