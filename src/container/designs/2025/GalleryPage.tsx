import React from 'react';
import { fetchImagesList, loadImagesMetadata } from '@/utils/gallery/imageUtils';
import GalleryClient from '@/container/designs/2025/gallery/components/GalleryClient';
import { defaultLocale, getTranslations } from '@/i18n';

export const dynamic = 'force-static';

export default async function GalleryPage2025() {
  const translations = getTranslations(defaultLocale);

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


