import React from 'react';
import type { ImageData } from '@/utils/gallery/imageUtils';
import ImageThumbnail from './ImageThumbnail';

interface ImageGridProps {
  images: ImageData[];
  onImageClick: (id: number) => void;
}

/**
 * 이미지 그리드 컴포넌트
 * 썸네일들을 좌우로 나열하되 빈 공간을 자동으로 채웁니다 (테트리스 방식)
 * CSS Grid의 dense 옵션을 사용하여 효율적으로 공간을 활용합니다
 */
const ImageGrid = ({ images, onImageClick }: ImageGridProps) => {
  return (
    <div className="grid w-full auto-rows-[10px] grid-cols-2 gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 [grid-auto-flow:dense]">
      {images.map((image, index) => (
        <ImageThumbnail key={image.id} image={image} index={index} onImageClick={onImageClick} />
      ))}
    </div>
  );
};

export default ImageGrid;
