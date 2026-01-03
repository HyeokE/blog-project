import React from 'react';
import { fetchImagesList, loadImagesMetadata } from '@/utils/gallery/imageUtils';
import GalleryClient from '@/container/designs/2025/gallery/components/GalleryClient';
import { headers } from 'next/headers';
import { defaultLocale, getTranslations } from '@/i18n';

async function getBrowserLanguage(): Promise<'ko' | 'en'> {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];
  return ['ko', 'en'].includes(preferredLanguage)
    ? (preferredLanguage as 'ko' | 'en')
    : defaultLocale;
}

export default async function GalleryPage2025() {
  const lang = await getBrowserLanguage();
  const translations = getTranslations(lang);

  try {
    const imagesList = await fetchImagesList();
    if (imagesList.length === 0) {
      return <GalleryClient initialImages={[]} initialError={translations.gallery.errors.no_images} />;
    }
    try {
      const imagesWithMetadata = await loadImagesMetadata(imagesList);
      return <GalleryClient initialImages={imagesWithMetadata} />;
    } catch (metadataError) {
      console.error('메타데이터 로딩 중 오류 발생:', metadataError);
      return (
        <GalleryClient
          initialImages={imagesList}
          initialError={translations.gallery.errors.metadata_error}
        />
      );
    }
  } catch (err) {
    console.error('이미지 목록을 가져오는 중 오류 발생:', err);
    const errorMessage = translations.gallery.errors.loading_error;
    return <GalleryClient initialImages={[]} initialError={errorMessage} />;
  }
}


