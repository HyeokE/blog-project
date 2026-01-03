import React from 'react';
import type { ImageData } from '@/utils/gallery/imageUtils';
import ImageThumbnail from '@/container/designs/2025/gallery/components/ImageThumbnail';

interface ImageGridProps {
  images: ImageData[];
  onImageClick: (id: number) => void;
}

const ImageGrid = ({ images, onImageClick }: ImageGridProps) => {
  return (
    <div className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {images.map((image, index) => (
        <ImageThumbnail key={image.id} image={image} index={index} onImageClick={onImageClick} />
      ))}
    </div>
  );
};

export default ImageGrid;


