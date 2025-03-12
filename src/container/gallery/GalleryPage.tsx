import React from 'react';
import { fetchImagesList, loadImagesMetadata } from '@/utils/gallery/imageUtils';
import GalleryClient from './components/GalleryClient';

// 정적 생성 설정 (ISR 사용)
export const dynamic = 'force-static';
export const revalidate = 3600; // 1시간마다 재검증

/**
 * 갤러리 페이지 서버 컴포넌트
 */
const GalleryPage = async () => {
  try {
    // 이미지 목록 가져오기
    const imagesList = await fetchImagesList();

    // 이미지가 없는 경우
    if (imagesList.length === 0) {
      return (
        <GalleryClient
          initialImages={[]}
          initialError="이미지를 찾을 수 없습니다. public/images 폴더에 이미지를 추가해주세요."
        />
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
      return <GalleryClient initialImages={imagesList} />;
    }
  } catch (err) {
    console.error('이미지 목록을 가져오는 중 오류 발생:', err);
    const errorMessage =
      err instanceof Error
        ? `이미지 로딩 오류: ${err.message}`
        : '이미지를 불러오는 중 오류가 발생했습니다';

    // 에러 상태로 클라이언트 컴포넌트 렌더링
    return <GalleryClient initialImages={[]} initialError={errorMessage} />;
  }
};

export default GalleryPage;
