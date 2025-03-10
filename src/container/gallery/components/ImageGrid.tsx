import React from 'react';
import type { ImageData } from '@/utils/gallery/imageUtils';
import ImageThumbnail from './ImageThumbnail';

interface ImageGridProps {
  images: ImageData[];
  onImageClick: (id: number) => void;
}

/**
 * 이미지 그리드 컴포넌트
 * 썸네일들을 그리드 형태로 배치합니다
 */
const ImageGrid = ({ images, onImageClick }: ImageGridProps) => {
  return (
    <div className="grid w-full grid-cols-2 gap-1 md:grid-cols-3 md:gap-2 lg:grid-cols-4 xl:grid-cols-5">
      {images.map((image, index) => (
        <ImageThumbnail key={image.id} image={image} index={index} onImageClick={onImageClick} />
      ))}
    </div>
  );
};

export default ImageGrid;
