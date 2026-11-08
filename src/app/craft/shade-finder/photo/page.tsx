import type { Metadata } from 'next';

const title = 'Shade Finder · 피부 사진으로 파운데이션 컬러 찾기 | Craft';
const image = '/craft/shade-finder/opengraph-image';
const description = '촬영하거나 업로드한 사진에서 흰 종이와 피부 영역을 선택하고, 색 편향을 보정한 컬러와 비슷한 파운데이션·쿠션을 찾아보세요.';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/craft/shade-finder/photo' },
  openGraph: {
    type: 'website',
    siteName: 'HYEOK.DEV',
    locale: 'ko_KR',
    url: '/craft/shade-finder/photo',
    title,
    description,
    images: [{ url: image, width: 1200, height: 630, alt: 'Shade Finder · 파운데이션과 쿠션 컬러 찾기' }],
  },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};

export default function ShadeFinderPhotoPage() {
  return null;
}
