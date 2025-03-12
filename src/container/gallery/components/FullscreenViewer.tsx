import React, { useState } from 'react';
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
  // 스와이프 애니메이션을 위한 상태
  const [dragDirection, setDragDirection] = useState<string | null>(null);
  const [exitX, setExitX] = useState<number>(0);
  const [exitY, setExitY] = useState<number>(0);
  // 페이드 아웃 애니메이션을 위한 상태
  const [isClosing, setIsClosing] = useState(false);

  if (!selectedImageData) {
    return null;
  }

  // 닫기 핸들러 - 페이드 아웃 애니메이션 적용
  const handleClose = () => {
    setIsClosing(true);
    // 애니메이션 시간을 고려하여 setTimeout 설정
    setTimeout(() => {
      onCloseClick();
      setIsClosing(false);
    }, 300); // 애니메이션 종료 시간과 일치하게 설정
  };

  // 스와이프 제스처 핸들러
  const handleDragEnd = (
    event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
  ) => {
    const { offset, velocity } = info;
    const swipeThreshold = 50; // 스와이프로 인식할 최소 거리
    const velocityThreshold = 0.5; // 스와이프로 인식할 최소 속도

    // 수평 스와이프 감지 (좌우)
    if (Math.abs(offset.x) > Math.abs(offset.y) && Math.abs(offset.x) > swipeThreshold) {
      if (offset.x > 0 && velocity.x >= velocityThreshold) {
        // 오른쪽으로 스와이프 (이전 이미지)
        setDragDirection('right');
        setExitX(250);
        setTimeout(() => {
          onPrevClick();
          setDragDirection(null);
          setExitX(0);
        }, 200);
      } else if (offset.x < 0 && velocity.x <= -velocityThreshold) {
        // 왼쪽으로 스와이프 (다음 이미지)
        setDragDirection('left');
        setExitX(-250);
        setTimeout(() => {
          onNextClick();
          setDragDirection(null);
          setExitX(0);
        }, 200);
      }
    }
    // 수직 스와이프 감지 (아래로)
    else if (offset.y > swipeThreshold && velocity.y >= velocityThreshold) {
      // 아래로 스와이프 (뷰어 닫기)
      setDragDirection('down');
      setExitY(250);
      setTimeout(() => {
        handleClose(); // 페이드 아웃 애니메이션과 함께 닫기
        setDragDirection(null);
        setExitY(0);
      }, 200);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black"
      onClick={handleClose} // 페이드 아웃 애니메이션과 함께 닫기
      initial={{ opacity: 0 }}
      animate={{ opacity: isClosing ? 0 : 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* 닫기 버튼 */}
      <motion.button
        className="absolute top-4 left-4 z-50 rounded-full bg-black/50 p-2 text-white"
        onClick={(e) => {
          e.stopPropagation();
          handleClose(); // 페이드 아웃 애니메이션과 함께 닫기
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: isClosing ? 0 : 1, scale: 1 }}
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
        animate={{ opacity: isClosing ? 0 : 1, x: 0 }}
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
        animate={{ opacity: isClosing ? 0 : 1, x: 0 }}
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
        animate={{
          scale: isClosing ? 0.95 : 1,
          opacity: isClosing ? 0 : 1,
          x: dragDirection ? exitX : 0,
          y: dragDirection ? exitY : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        key={selectedImageData.id}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
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
            animate={{ opacity: isClosing ? 0 : 1, y: 0 }}
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
