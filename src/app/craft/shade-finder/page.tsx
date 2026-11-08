import type { Metadata } from 'next';

const title = 'Shade Finder · 비슷한 파운데이션 컬러 찾기 | Craft';
const description = '내가 쓰는 파운데이션과 쿠션의 호수를 기준으로 다른 제품의 비슷한 컬러를 찾아보세요.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/craft/shade-finder' },
  openGraph: {
    type: 'website',
    siteName: 'HYEOK.DEV',
    locale: 'ko_KR',
    url: '/craft/shade-finder',
    title,
    description,
  },
  twitter: { card: 'summary_large_image', title, description },
};

export default function ShadeFinderPage() {
  return null;
}
