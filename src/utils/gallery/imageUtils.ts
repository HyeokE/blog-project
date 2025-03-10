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
    // API에서 이미지 목록 가져오기
    const response = await fetch('/api/images');

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
        const { metadata, hasValidMetadata } = await parseImageMetadata(image.src);
        return { ...image, metadata, hasValidMetadata };
      }),
    );

    return updatedImages;
  } catch (error) {
    console.error('이미지 메타데이터 로딩 오류:', error);
    throw error;
  }
};
