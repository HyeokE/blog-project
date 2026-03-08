import type { Metadata } from 'next';
import AboutPage from '@/container/about/AboutPage';
import { defaultLocale, getTranslations } from '@/i18n';

const translations = getTranslations(defaultLocale);

export const metadata: Metadata = {
  title: translations.about.meta.title,
  description: translations.about.meta.description,
  openGraph: {
    title: translations.about.meta.title,
    description: translations.about.meta.description,
  },
};

export default function About() {
  return <AboutPage />;
}
