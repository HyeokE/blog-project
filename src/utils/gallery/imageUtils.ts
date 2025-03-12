import type { ImageMetadata } from './metadataUtils';
import { parseImageMetadata } from './metadataUtils';
import fs from 'fs';
import path from 'path';

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

// 지원하는 이미지 확장자
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * public/images 폴더에서 이미지 목록을 가져오는 함수
 */
export const fetchImagesList = async (): Promise<ImageData[]> => {
  try {
    // public/images 디렉토리 경로
    const imagesDirectory = path.join(process.cwd(), 'public', 'images');

    // 디렉토리가 존재하는지 확인
    if (!fs.existsSync(imagesDirectory)) {
      console.error('이미지 디렉토리를 찾을 수 없습니다:', imagesDirectory);
      return [];
    }

    // 디렉토리 내용 읽기
    const fileNames = fs.readdirSync(imagesDirectory);

    // 이미지 파일만 필터링
    const imageFiles = fileNames.filter((fileName) => {
      const extension = path.extname(fileName).toLowerCase();
      return SUPPORTED_EXTENSIONS.includes(extension);
    });

    // 이미지 데이터 구성
    const images = imageFiles.map((fileName, index) => ({
      id: index + 1,
      src: `/images/${fileName}`,
      alt: `갤러리 이미지 ${index + 1}`,
      metadata: {},
    }));

    return images;
  } catch (error) {
    console.error('이미지 목록을 가져오는 중 오류 발생:', error);
    // 오류 발생 시 빈 배열 반환
    return [];
  }
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

    // 기본 URL 설정 (서버 측에서는 process.env.NEXT_PUBLIC_API_URL 또는 기본값 사용)
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

    // 모든 이미지에 대해 메타데이터 파싱
    const updatedImages = await Promise.all(
      imageList.map(async (image) => {
        try {
          // 상대 경로를 절대 URL로 변환
          const absoluteImageUrl = new URL(image.src, baseUrl).toString();

          // 절대 URL로 메타데이터 파싱
          const { metadata, hasValidMetadata } = await parseImageMetadata(absoluteImageUrl);
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
