import AboutPage from '@/container/about/AboutPage';
import React from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HYEOK | About',
  description: '소프트웨어 엔지니어 HYEOK에 대한 소개 페이지입니다.',
  openGraph: {
    title: 'HYEOK | About',
    description: '소프트웨어 엔지니어 HYEOK에 대한 소개 페이지입니다.',
  },
};

function About() {
  return <AboutPage />;
}

export default About;
