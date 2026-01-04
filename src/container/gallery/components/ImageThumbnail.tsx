import Image from 'next/image';
import * as motion from 'motion/react-client';
import type { ImageData } from '@/utils/gallery/imageUtils';
import ImageMetadataDisplay from './ImageMetadataDisplay';

interface ImageThumbnailProps {
  image: ImageData;
  index: number;
  onImageClick: (id: number) => void;
}

/**
 * 갤러리에 표시될 개별 이미지 썸네일 컴포넌트
 */
const ImageThumbnail = ({ image, index: _index, onImageClick }: ImageThumbnailProps) => {
  // 서버에서 계산된 비율 정보 사용
  const isWide = image.isWide || false;
  
  // 고정 비율 사용
  // 세로 사진: 3:2 (높이:너비) → aspect ratio = 1.5
  // 가로 사진: 2:3 (높이:너비) → aspect ratio = 0.667
  const aspectRatio = isWide ? (2 / 3) : (3 / 2);
  
  // 가로 사진인 경우 2열, 세로 사진인 경우 1열
  const colSpan = isWide ? 2 : 1;
  
  // row span 계산 (10px 단위)
  const rowSpan = isWide
    ? Math.ceil(aspectRatio * 18) // 가로 사진: 2:3 비율
    : Math.ceil(aspectRatio * 10); // 세로 사진: 3:2 비율

  return (
    <motion.div
      key={image.id}
      className="group relative cursor-pointer overflow-hidden rounded-lg"
      style={{ gridRowEnd: `span ${rowSpan}`, gridColumn: `span ${colSpan}` }}
      onClick={() => onImageClick(image.id)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* 원본 비율 유지 이미지 */}
      <Image
        src={image.src}
        alt={image.alt}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        className="select-none object-cover"
        placeholder={image.blurDataURL ? 'blur' : 'empty'}
        blurDataURL={image.blurDataURL}
      />

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
