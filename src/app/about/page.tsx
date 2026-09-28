import type { Metadata } from 'next';
import LightAboutPage from '@/container/light-wall/pages/AboutPage';
import { defaultLocale, getTranslations } from '@/i18n';

const translations = getTranslations(defaultLocale);

export const metadata: Metadata = {
  title: 'HYEOK | 이력서',
  description: translations.about.meta.description,
  openGraph: {
    title: 'HYEOK | 이력서',
    description: translations.about.meta.description,
  },
};

export default function Page() {
  return <LightAboutPage />;
}
