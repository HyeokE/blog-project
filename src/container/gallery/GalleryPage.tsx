'use server';

import React from 'react';
import { fetchImagesList, loadImagesMetadata } from '@/utils/gallery/imageUtils';
import GalleryClient from './components/GalleryClient';
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

export default async function GalleryPage() {
  const lang = await getBrowserLanguage();
  const translations = getTranslations(lang);

  try {
    // 이미지 목록 가져오기
    const imagesList = await fetchImagesList();

    // 이미지가 없는 경우
    if (imagesList.length === 0) {
      return (
        <GalleryClient initialImages={[]} initialError={translations.gallery.errors.no_images} />
      );
    }

    try {
      // 이미지 메타데이터 로드
      const imagesWithMetadata = await loadImagesMetadata(imagesList);

      // 클라이언트 컴포넌트에 데이터 전달
      return <GalleryClient initialImages={imagesWithMetadata} />;
    } catch (metadataError) {
      console.error('메타데이터 로딩 중 오류 발생:', metadataError);
      // 메타데이터 로딩 실패 시 기본 이미지 목록 사용
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

    // 에러 상태로 클라이언트 컴포넌트 렌더링
    return <GalleryClient initialImages={[]} initialError={errorMessage} />;
  }
}
