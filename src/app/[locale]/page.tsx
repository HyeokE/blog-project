import HomePage from '@/container/home/HomePage';
import type { Metadata } from 'next';
import { generateLocalizedMetadata } from '@/lib/i18n-server';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;

  return generateLocalizedMetadata(locale, 'home.meta.title', 'home.meta.description');
}

export default async function Home({ params }: PageProps) {
  const { locale } = await params;

  return <HomePage locale={locale} />;
}
