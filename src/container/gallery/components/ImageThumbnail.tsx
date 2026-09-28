import { ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import Image from 'next/image';
import * as motion from 'motion/react-client';
import type { ImageData } from '@/utils/gallery/imageUtils';
import ImageMetadataDisplay from './ImageMetadataDisplay';
import { useDesignTheme } from '@/context/DesignThemeContext';

interface ImageThumbnailProps {
  image: ImageData;
  index: number;
  onImageClick: (id: number) => void;
}

/**
 * 갤러리에 표시될 개별 이미지 썸네일 컴포넌트
 */
const ImageThumbnail = ({ image, index, onImageClick }: ImageThumbnailProps) => {
  const { theme } = useDesignTheme();
  const isSweetHome = theme === 'sweet-home';
  // 서버에서 계산된 비율 정보 사용
  const isWide = image.isWide || false;

  // 가로 사진인 경우 2열, 세로 사진인 경우 1열
  const colSpan = isWide ? 2 : 1;

  // CSS aspect-ratio로 반응형 대응
  // 세로 사진: width:height = 2:3 → aspect-ratio = 2/3 (높이가 1.5배)
  // 가로 사진: width:height = 4:3 → aspect-ratio = 4/3 (높이를 조금 더)
  const aspectRatio = isWide ? '3 / 2' : '2 / 3';
  // Match the rendered grid, including landscape photos spanning two columns.
  // Accurate sizes lets Retina screens request enough pixels for fine detail.
  const sizes = isSweetHome
    ? isWide
      ? '(max-width: 700px) calc(100vw - 48px), (max-width: 767px) 88vw, (max-width: 1279px) calc(58.667vw - 6.667px), (max-width: 1535px) min(calc(44vw - 10px), 630px), 500px'
      : '(max-width: 700px) calc(50vw - 29px), (max-width: 767px) calc(44vw - 10px), (max-width: 1279px) calc(29.333vw - 13.333px), (max-width: 1535px) min(calc(22vw - 15px), 305px), 240px'
    : '(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw';
  const previews = isSweetHome ? image.previews : undefined;
  const preview = previews?.find(({ width }) => width >= 640) ?? previews?.at(-1);

  return (
    <motion.div
      data-analytics-label={ANALYTICS_ELEMENTS.GALLERY_OPEN}
      data-analytics-section={ANALYTICS_SECTIONS.GALLERY}
      data-analytics-id={image.src}
      key={image.id}
      className="group relative cursor-pointer overflow-hidden rounded-lg"
      style={{
        gridColumn: `span ${colSpan}`,
        aspectRatio: aspectRatio,
      }}
      onClick={() => onImageClick(image.id)}
      initial={isSweetHome ? false : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* 원본 비율 유지 이미지 */}
      {preview ? (
        // Generated WebP files already contain the exact responsive sizes.
        <img
          src={preview.src}
          srcSet={previews?.map(({ src, width }) => `${src} ${width}w`).join(', ')}
          sizes={sizes}
          alt={image.alt}
          width={preview.width}
          height={preview.height}
          loading={index < 2 ? 'eager' : 'lazy'}
          fetchPriority={index === 0 ? 'high' : 'auto'}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover select-none"
          style={
            image.blurDataURL
              ? {
                  backgroundImage: `url(${image.blurDataURL})`,
                  backgroundSize: 'cover',
                }
              : undefined
          }
        />
      ) : (
        <Image
          src={image.src}
          alt={image.alt}
          fill
          sizes={sizes}
          quality={isSweetHome ? 92 : 75}
          loading={isSweetHome && index < 2 ? 'eager' : 'lazy'}
          fetchPriority={isSweetHome && index === 0 ? 'high' : 'auto'}
          className="object-cover select-none"
          placeholder={image.blurDataURL ? 'blur' : 'empty'}
          blurDataURL={image.blurDataURL}
        />
      )}

      {/* 이미지 정보 오버레이 - 메타데이터가 유효한 경우만 표시 */}
      {image.hasValidMetadata && (
        <div
          className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ pointerEvents: 'none' }}
        >
          <ImageMetadataDisplay metadata={image.metadata} />
        </div>
      )}
    </motion.div>
  );
};

export default ImageThumbnail;
