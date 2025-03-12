import React from 'react';
import GalleryPage from '@/container/gallery/GalleryPage';
import type { Metadata } from 'next';

// 정적 생성 설정
export const dynamic = 'force-static';
export const revalidate = 3600; // 1시간마다 재검증

export const metadata: Metadata = {
  title: 'HYEOK | 갤러리',
  description: '취미로 촬영한 사진을 모아둔 갤러리 페이지입니다.',
  openGraph: {
    title: 'HYEOK | 갤러리',
    description: '취미로 촬영한 사진을 모아둔 갤러리 페이지입니다.',
  },
};

export default function Gallery() {
  return <GalleryPage />;
}
