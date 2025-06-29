import React from 'react';
import type { Metadata } from 'next';
import GalleryPage from '@/container/gallery/GalleryPage';
import { generateLocalizedMetadata } from '@/lib/i18n-server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return generateLocalizedMetadata(locale, 'gallery.meta.title', 'gallery.meta.description');
}

export default async function Gallery({ params }: PageProps) {
  const { locale: _locale } = await params;
  return <GalleryPage />;
}
