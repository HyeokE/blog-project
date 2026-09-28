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
  width?: number; // 이미지 가로 크기
  height?: number; // 이미지 세로 크기
  aspectRatio?: number; // 비율 (height / width)
  isWide?: boolean; // 가로 사진 여부
  blurDataURL?: string; // 블러 플레이스홀더 URL
  previews?: Array<{ src: string; width: number; height: number }>;
}

// 지원하는 이미지 확장자
const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

type GalleryPreview = {
  width: number;
  height: number;
  blurDataURL: string;
  previews: NonNullable<ImageData['previews']>;
};

/** Built by gallery:previews. Missing caches retain the original-image fallback. */
const readGalleryPreviews = (): Record<string, GalleryPreview> => {
  try {
    const manifestPath = path.join(process.cwd(), 'public', '_gallery', 'manifest.json');
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8')).images ?? {};
  } catch {
    return {};
  }
};

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

    // Attach prebuilt assets without invoking the image optimizer at request time.
    const previews = readGalleryPreviews();
    const images = imageFiles.map((fileName, index) => ({
      id: index + 1,
      src: `/images/${fileName}`,
      alt: `갤러리 이미지 ${index + 1}`,
      metadata: {},
      ...previews[`/images/${fileName}`],
    }));

    return images;
  } catch (error) {
    console.error('이미지 목록을 가져오는 중 오류 발생:', error);
    // 오류 발생 시 빈 배열 반환
    return [];
  }
};

/**
 * 이미지 크기 정보와 블러 플레이스홀더를 가져오는 함수
 */
const getImageDimensions = async (
  imagePath: string,
): Promise<{ width: number; height: number; blurDataURL: string } | null> => {
  try {
    const sharp = (await import('sharp')).default;
    const filePath = path.join(process.cwd(), 'public', imagePath);

    // 메타데이터 가져오기
    const metadata = await sharp(filePath).metadata();

    // 블러 플레이스홀더 생성 (작은 크기로 리사이즈 후 base64 변환)
    const blurBuffer = await sharp(filePath)
      .rotate()
      .resize(10) // 작은 크기로 리사이즈
      .blur()
      .jpeg()
      .toBuffer();

    const blurDataURL = `data:image/jpeg;base64,${blurBuffer.toString('base64')}`;

    return {
      width: ((metadata.orientation ?? 1) >= 5 ? metadata.height : metadata.width) || 0,
      height: ((metadata.orientation ?? 1) >= 5 ? metadata.width : metadata.height) || 0,
      blurDataURL,
    };
  } catch (error) {
    console.error(`이미지 정보를 가져올 수 없습니다 (${imagePath}):`, error);
    return null;
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

    const previews = readGalleryPreviews();
    // 모든 이미지에 대해 메타데이터 파싱
    const updatedImages = await Promise.all(
      imageList.map(async (image) => {
        try {
          // 파일 시스템에서 직접 메타데이터 파싱 (상대 경로 사용)
          const { metadata, hasValidMetadata } = await parseImageMetadata(image.src);

          // 이미지 크기 정보와 블러 플레이스홀더 가져오기
          const dimensions = previews[image.src] ?? (await getImageDimensions(image.src));

          if (dimensions) {
            const aspectRatio = dimensions.height / dimensions.width;
            const isWide = aspectRatio < 0.9; // 가로 사진 판단 기준

            return {
              ...image,
              metadata,
              hasValidMetadata,
              width: dimensions.width,
              height: dimensions.height,
              aspectRatio,
              isWide,
              blurDataURL: dimensions.blurDataURL,
              previews: previews[image.src]?.previews,
            };
          }

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
