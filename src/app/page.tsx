import React from 'react';
import HomePage from '@/container/home/HomePage';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '블로그 | 홈',
  description: '다양한 주제의 글과 생각을 공유하는 개인 블로그입니다.',
  openGraph: {
    title: '블로그 | 홈',
    description: '다양한 주제의 글과 생각을 공유하는 개인 블로그입니다.',
    images: ['/images/home-og.jpg'], // 홈페이지 대표 이미지가 있다면 경로 설정
  },
};

export default function Home() {
  return <HomePage />;
}
