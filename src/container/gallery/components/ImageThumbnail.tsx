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
  
  // 가로 사진인 경우 2열, 세로 사진인 경우 1열
  const colSpan = isWide ? 2 : 1;
  
  // CSS aspect-ratio로 반응형 대응
  // 세로 사진: width:height = 2:3 → aspect-ratio = 2/3 (높이가 1.5배)
  // 가로 사진: width:height = 4:3 → aspect-ratio = 4/3 (높이를 조금 더)
  const aspectRatio = isWide ? '4 / 3' : '2 / 3';

  return (
    <motion.div
      key={image.id}
      className="group relative cursor-pointer overflow-hidden rounded-lg"
      style={{
        gridColumn: `span ${colSpan}`,
        aspectRatio: aspectRatio,
      }}
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
