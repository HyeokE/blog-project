'use client';
import React, { useState } from 'react';
import * as motion from 'motion/react-client';
import type { ImageData } from '@/utils/gallery/imageUtils';

// 컴포넌트 임포트
import ImageGrid from './ImageGrid';
import FullscreenViewer from './FullscreenViewer';
import LoadingState from './LoadingState';
import ErrorMessage from './ErrorMessage';
import EmptyGallery from './EmptyGallery';

interface GalleryClientProps {
  initialImages: ImageData[];
  initialError?: string | null;
}

/**
 * 갤러리 클라이언트 컴포넌트
 * 서버에서 가져온 데이터를 사용하여 UI 상태를 관리합니다
 */
const GalleryClient = ({ initialImages, initialError = null }: GalleryClientProps) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [images] = useState<ImageData[]>(initialImages);
  const [isLoading] = useState<boolean>(false); // 서버에서 데이터를 가져왔으므로 로딩 상태는 false
  const [error] = useState<string | null>(initialError);

  const openImage = (id: number) => {
    setSelectedImage(id);
    // 모달이 열릴 때 스크롤을 막습니다
    document.body.style.overflow = 'hidden';
  };

  const closeImage = () => {
    setSelectedImage(null);
    // 모달이 닫힐 때 스크롤을 다시 허용합니다
    document.body.style.overflow = 'auto';
  };

  const nextImage = () => {
    if (selectedImage === null || images.length === 0) {
      return;
    }
    const currentIndex = images.findIndex((img) => img.id === selectedImage);
    const nextIndex = (currentIndex + 1) % images.length;
    setSelectedImage(images[nextIndex].id);
  };

  const prevImage = () => {
    if (selectedImage === null || images.length === 0) {
      return;
    }
    const currentIndex = images.findIndex((img) => img.id === selectedImage);
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIndex].id);
  };

  const handleRetry = () => {
    window.location.reload();
  };

  // 선택된 이미지 정보
  const selectedImageData = selectedImage
    ? images.find((img) => img.id === selectedImage) || null
    : null;

  return (
    <div className="flex h-full w-full flex-col items-center justify-start pt-3 pb-20">
      <motion.div
        className="w-full max-w-[1280px] px-3 md:max-w-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* 로딩 상태 표시 */}
        {isLoading && <LoadingState />}

        {/* 에러 메시지 표시 */}
        {error && !isLoading && <ErrorMessage message={error} onRetry={handleRetry} />}

        {/* 이미지 그리드 */}
        {!isLoading && !error && images.length > 0 && (
          <ImageGrid images={images} onImageClick={openImage} />
        )}

        {/* 이미지가 없을 때 메시지 */}
        {!isLoading && !error && images.length === 0 && <EmptyGallery />}
      </motion.div>

      {/* 전체 화면 이미지 뷰어 */}
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
