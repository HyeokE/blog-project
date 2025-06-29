import React from 'react';
import type { Metadata } from 'next';
import AboutPage from '@/container/about/AboutPage';
import { generateLocalizedMetadata } from '@/lib/i18n-server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'about.meta.title', 'about.meta.description');
}

export default async function About({ params }: PageProps) {
  const { locale: _locale } = await params;
  return <AboutPage />;
}
