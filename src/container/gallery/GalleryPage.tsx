'use client';
import React, { useState, useEffect } from 'react';
import * as motion from 'motion/react-client';

// 유틸리티 함수 임포트
import type { ImageData } from '@/utils/gallery/imageUtils';
import { fetchImagesList, loadImagesMetadata } from '@/utils/gallery/imageUtils';

// 컴포넌트 임포트
import ImageGrid from './components/ImageGrid';
import FullscreenViewer from './components/FullscreenViewer';
import LoadingState from './components/LoadingState';
import ErrorMessage from './components/ErrorMessage';
import EmptyGallery from './components/EmptyGallery';

/**
 * 갤러리 페이지 컴포넌트
 */
const GalleryPage = () => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [images, setImages] = useState<ImageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 이미지 목록 가져오기
  useEffect(() => {
    const getImages = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 이미지 목록 가져오기
        const imagesList = await fetchImagesList();
        setImages(imagesList);

        // 이미지 메타데이터 로드
        const imagesWithMetadata = await loadImagesMetadata(imagesList);
        setImages(imagesWithMetadata);
      } catch (err) {
        console.error('이미지 목록을 가져오는 중 오류 발생:', err);
        setError(err instanceof Error ? err.message : '이미지를 불러오는 중 오류가 발생했습니다');
      } finally {
        setIsLoading(false);
      }
    };

    getImages();
  }, []);

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
    <div className="flex h-full w-full flex-col items-center justify-start pt-10 pb-20">
      <motion.div
        className="w-full max-w-[1280px] px-4 md:max-w-6xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="mb-6 text-3xl font-bold">갤러리</h1>

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

export default GalleryPage;
