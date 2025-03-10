import React from 'react';
import Image from 'next/image';
import * as motion from 'motion/react-client';
import type { ImageData } from '@/utils/gallery/imageUtils';
import ImageMetadataDisplay from './ImageMetadataDisplay';

interface FullscreenViewerProps {
  selectedImageData: ImageData | null;
  onCloseClick: () => void;
  onPrevClick: () => void;
  onNextClick: () => void;
}

/**
 * 전체 화면 이미지 뷰어 컴포넌트
 */
const FullscreenViewer = ({
  selectedImageData,
  onCloseClick,
  onPrevClick,
  onNextClick,
}: FullscreenViewerProps) => {
  if (!selectedImageData) {
    return null;
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={onCloseClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 닫기 버튼 */}
      <motion.button
        className="absolute top-4 left-4 z-50 rounded-full bg-black/50 p-2 text-white"
        onClick={(e) => {
          e.stopPropagation();
          onCloseClick();
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </motion.button>

      {/* 이전 이미지 버튼 */}
      <motion.button
        className="absolute top-1/2 left-4 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
        onClick={(e) => {
          e.stopPropagation();
          onPrevClick();
        }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </motion.button>

      {/* 다음 이미지 버튼 */}
      <motion.button
        className="absolute top-1/2 right-4 z-50 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white"
        onClick={(e) => {
          e.stopPropagation();
          onNextClick();
        }}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 400, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </motion.button>

      <motion.div
        className="relative h-full w-full"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        key={selectedImageData.id}
      >
        <Image
          src={selectedImageData.src}
          alt={selectedImageData.alt}
          fill
          sizes="100vw"
          className="object-contain"
          priority
        />

        {/* 전체화면 모드에서 메타데이터 표시 - 메타데이터가 유효한 경우만 표시 */}
        {selectedImageData.hasValidMetadata && (
          <motion.div
            className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.3 }}
          >
            <ImageMetadataDisplay metadata={selectedImageData.metadata} isFullscreen={true} />
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default FullscreenViewer;
