import React from 'react';
import { fetchImagesList, loadImagesMetadata } from '@/utils/gallery/imageUtils';
import GalleryClient from './components/GalleryClient';

/**
 * 갤러리 페이지 서버 컴포넌트
 */
const GalleryPage = async () => {
  try {
    // 서버에서 이미지 목록 가져오기
    const imagesList = await fetchImagesList();

    try {
      // 서버에서 이미지 메타데이터 로드
      const imagesWithMetadata = await loadImagesMetadata(imagesList);

      // 클라이언트 컴포넌트에 데이터 전달
      return <GalleryClient initialImages={imagesWithMetadata} />;
    } catch (metadataError) {
      console.error('메타데이터 로딩 중 오류 발생:', metadataError);
      // 메타데이터 로딩 실패 시 기본 이미지 목록 사용
      return <GalleryClient initialImages={imagesList} />;
    }
  } catch (err) {
    console.error('서버에서 이미지 목록을 가져오는 중 오류 발생:', err);
    const errorMessage =
      err instanceof Error ? err.message : '이미지를 불러오는 중 오류가 발생했습니다';

    // 에러 상태로 클라이언트 컴포넌트 렌더링
    return <GalleryClient initialImages={[]} initialError={errorMessage} />;
  }
};

export default GalleryPage;
