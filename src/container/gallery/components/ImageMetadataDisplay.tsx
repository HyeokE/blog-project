import React from 'react';
import type { ImageMetadata } from '@/utils/gallery/metadataUtils';
import { getMapLink } from '@/utils/gallery/metadataUtils';

interface ImageMetadataDisplayProps {
  metadata: ImageMetadata;
  isFullscreen?: boolean;
}

/**
 * 이미지 메타데이터를 표시하는 컴포넌트
 */
const ImageMetadataDisplay = ({ metadata, isFullscreen = false }: ImageMetadataDisplayProps) => {
  const textSize = isFullscreen ? 'text-sm' : 'text-xs';
  const marginBottom = isFullscreen ? 'mb-1' : '';

  return (
    <>
      {metadata.location && (
        <p className={`${textSize} text-white ${marginBottom}`}>
          <span className="opacity-75">위치: </span>
          <span className="font-medium">{metadata.location}</span>
          {isFullscreen && metadata.coordinates && (
            <a
              href={getMapLink(metadata.coordinates)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-2 text-blue-300 underline"
            >
              지도에서 보기
            </a>
          )}
        </p>
      )}

      {metadata.focalLength && (
        <p className={`${textSize} text-white ${marginBottom}`}>
          <span className="opacity-75">초점 거리: </span>
          <span className="font-medium">{metadata.focalLength}</span>
        </p>
      )}
      {metadata.aperture && (
        <p className={`${textSize} text-white ${marginBottom}`}>
          <span className="opacity-75">조리개: </span>
          <span className="font-medium">{metadata.aperture}</span>
        </p>
      )}
      {metadata.shutterSpeed && (
        <p className={`${textSize} text-white ${marginBottom}`}>
          <span className="opacity-75">셔터 스피드: </span>
          <span className="font-medium">{metadata.shutterSpeed}</span>
        </p>
      )}
      {metadata.iso && (
        <p className={`${textSize} text-white ${marginBottom}`}>
          <span className="opacity-75">ISO: </span>
          <span className="font-medium">{metadata.iso}</span>
        </p>
      )}
      {metadata.lens && (
        <p className={`${textSize} text-white ${marginBottom}`}>
          <span className="opacity-75">렌즈: </span>
          <span className="font-medium">{metadata.lens}</span>
        </p>
      )}
      {metadata.device && (
        <p className={`${textSize} text-white ${marginBottom}`}>
          <span className="opacity-75">기기: </span>
          <span className="font-medium">{metadata.device}</span>
        </p>
      )}
      {metadata.dateTime && (
        <p className={`${textSize} text-white`}>
          <span className="opacity-75">날짜: </span>
          <span className="font-medium">{metadata.dateTime}</span>
        </p>
      )}
    </>
  );
};

export default ImageMetadataDisplay;
