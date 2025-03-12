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
 * @param retryCount 재시도 횟수 (기본값: 3)
 * @param retryDelay 재시도 간격 (밀리초, 기본값: 1000)
 */
export const fetchImagesList = async (retryCount = 3, retryDelay = 1000): Promise<ImageData[]> => {
  let lastError: Error | null = null;

  // 재시도 로직
  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      // 첫 시도가 아니면 지연 시간 적용
      if (attempt > 0) {
        console.info(`이미지 목록 가져오기 재시도 중... (${attempt}/${retryCount})`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }

      // API에서 이미지 목록 가져오기 (서버 컴포넌트에서 사용 가능하도록 절대 URL 사용)
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/images`, {
        cache: 'no-store',
        // 네트워크 타임아웃 설정
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '응답 텍스트를 읽을 수 없음');
        throw new Error(`이미지 목록을 가져오는데 실패했습니다: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 응답 데이터 검증
      if (!data) {
        throw new Error('응답 데이터가 비어있습니다');
      }

      if (!data.images) {
        // 오류 메시지가 있으면 표시
        if (data.error) {
          throw new Error(`API 오류: ${data.error} ${data.details ? `(${data.details})` : ''}`);
        }
        throw new Error('응답에 images 필드가 없습니다');
      }

      if (!Array.isArray(data.images)) {
        throw new Error('이미지 데이터 형식이 올바르지 않습니다 (배열이 아님)');
      }

      // 기본 메타데이터 필드 추가
      const imagesWithMetadata = data.images.map((img: Omit<ImageData, 'metadata'>) => ({
        ...img,
        metadata: {},
      }));

      return imagesWithMetadata;
    } catch (error) {
      console.error(
        `이미지 목록을 가져오는 중 오류 발생 (시도 ${attempt + 1}/${retryCount + 1}):`,
        error,
      );
      lastError = error instanceof Error ? error : new Error(String(error));

      // 마지막 시도가 아니면 계속 재시도
      if (attempt < retryCount) {
        continue;
      }
    }
  }

  // 모든 재시도 실패 시
  throw lastError || new Error('알 수 없는 오류로 이미지 목록을 가져오지 못했습니다');
};

/**
 * 이미지 목록에 대한 메타데이터를 로드하는 함수
 */
export const loadImagesMetadata = async (imageList: ImageData[]): Promise<ImageData[]> => {
  try {
    // 이미지 목록이 비어있으면 빈 배열 반환
    if (!imageList || imageList.length === 0) {
      console.info('메타데이터를 로드할 이미지가 없습니다.');
      return [];
    }

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
