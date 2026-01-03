 'use client';
import React, { useState } from 'react';
import * as motion from 'motion/react-client';
import type { ImageData } from '@/utils/gallery/imageUtils';
import ImageGrid from '@/container/designs/2025/gallery/components/ImageGrid';
import FullscreenViewer from '@/container/gallery/components/FullscreenViewer';
import LoadingState from '@/container/gallery/components/LoadingState';
import ErrorMessage from '@/container/gallery/components/ErrorMessage';
import EmptyGallery from '@/container/gallery/components/EmptyGallery';

interface GalleryClientProps {
  initialImages: ImageData[];
  initialError?: string | null;
}

const GalleryClient = ({ initialImages, initialError = null }: GalleryClientProps) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [images] = useState<ImageData[]>(initialImages);
  const [isLoading] = useState<boolean>(false);
  const [error] = useState<string | null>(initialError);

  const openImage = (id: number) => {
    setSelectedImage(id);
    document.body.style.overflow = 'hidden';
  };

  const closeImage = () => {
    setSelectedImage(null);
    document.body.style.overflow = 'auto';
  };

  const nextImage = () => {
    if (selectedImage === null || images.length === 0) return;
    const currentIndex = images.findIndex((img) => img.id === selectedImage);
    const nextIndex = (currentIndex + 1) % images.length;
    setSelectedImage(images[nextIndex].id);
  };

  const prevImage = () => {
    if (selectedImage === null || images.length === 0) return;
    const currentIndex = images.findIndex((img) => img.id === selectedImage);
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIndex].id);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const selectedImageData = selectedImage ? images.find((img) => img.id === selectedImage) || null : null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-start pt-0 pb-20">
      <motion.div
        className="w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {isLoading && <LoadingState />}
        {error && !isLoading && <ErrorMessage message={error} onRetry={handleRetry} />}
        {!isLoading && !error && images.length > 0 && (
          <ImageGrid images={images} onImageClick={openImage} />
        )}
        {!isLoading && !error && images.length === 0 && <EmptyGallery />}
      </motion.div>

      <FullscreenViewer
        selectedImageData={selectedImageData}
        onCloseClick={closeImage}
        onPrevClick={prevImage}
        onNextClick={nextImage}
      />
    </div>
  );
};

export default GalleryClient;


