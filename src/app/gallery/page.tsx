import React from 'react';
import GalleryPage from '@/container/gallery/GalleryPage';
import type { Metadata } from 'next';

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
