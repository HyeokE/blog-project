import type { ImageMetadata } from './metadataUtils';
import { parseImageMetadata } from './metadataUtils';

/**
 * 이미지 데이터 인터페이스 정의
 */
export interface ImageData {
  id: number;
  src: string;
  alt: string;
  metadata: ImageMetadata;
  hasValidMetadata?: boolean; // 유효한 메타데이터가 있는지 표시
}

/**
 * 서버 API를 통해 이미지 목록을 가져오는 함수
 */
export const fetchImagesList = async (): Promise<ImageData[]> => {
  try {
    // API에서 이미지 목록 가져오기 (서버 컴포넌트에서 사용 가능하도록 절대 URL 사용)
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/images`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`이미지 목록을 가져오는데 실패했습니다: ${response.status}`);
    }

    const data = await response.json();

    if (!data.images || !Array.isArray(data.images)) {
      throw new Error('이미지 데이터 형식이 올바르지 않습니다');
    }

    // 기본 메타데이터 필드 추가
    const imagesWithMetadata = data.images.map((img: Omit<ImageData, 'metadata'>) => ({
      ...img,
      metadata: {},
    }));

    return imagesWithMetadata;
  } catch (error) {
    console.error('이미지 목록을 가져오는 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 이미지 목록에 대한 메타데이터를 로드하는 함수
 */
export const loadImagesMetadata = async (imageList: ImageData[]): Promise<ImageData[]> => {
  try {
    // 모든 이미지에 대해 메타데이터 파싱
    const updatedImages = await Promise.all(
      imageList.map(async (image) => {
        try {
          const { metadata, hasValidMetadata } = await parseImageMetadata(image.src);
          return { ...image, metadata, hasValidMetadata };
        } catch (error) {
          console.error(`이미지 ${image.id}의 메타데이터 로딩 실패:`, error);
          // 개별 이미지 메타데이터 로딩 실패 시 기본값 반환
          return { ...image, metadata: {}, hasValidMetadata: false };
        }
      }),
    );

    return updatedImages;
  } catch (error) {
    console.error('이미지 메타데이터 로딩 오류:', error);
    // 오류 발생 시 원본 이미지 목록 반환
    return imageList.map((image) => ({ ...image, metadata: {}, hasValidMetadata: false }));
  }
};
