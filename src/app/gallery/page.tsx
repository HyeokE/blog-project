import React from 'react';
import type { Metadata } from 'next';
import { defaultLocale, getTranslations } from '@/i18n';
import LightGalleryPage from '@/container/light-wall/pages/GalleryPage';

// SSG를 위해 정적 메타데이터 생성
const translations = getTranslations(defaultLocale);

export const metadata: Metadata = {
  title: translations.gallery.meta.title,
  description: translations.gallery.meta.description,
  openGraph: {
    title: translations.gallery.meta.title,
    description: translations.gallery.meta.description,
  },
};

export default function Page() {
  return <LightGalleryPage />;
}
