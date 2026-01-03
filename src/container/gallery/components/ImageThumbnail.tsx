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
const ImageThumbnail = ({ image, index, onImageClick }: ImageThumbnailProps) => {
  return (
    <motion.div
      key={image.id}
      className="group relative mb-4 break-inside-avoid cursor-pointer overflow-hidden rounded-lg"
      onClick={() => onImageClick(image.id)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* 이미지 래퍼 */}
      <div className="relative w-full overflow-hidden">
        {/* 원본 비율 유지 이미지 */}
        <img
          src={image.src}
          alt={image.alt}
          loading="lazy"
          className="h-auto w-full select-none"
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
      </div>
    </motion.div>
  );
};

export default ImageThumbnail;
