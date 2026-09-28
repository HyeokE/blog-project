'use client';
import dynamic from 'next/dynamic';
import { useDesignTheme } from '@/context/DesignThemeContext';

const RootLayoutExtras2026 = dynamic(() => import('@/container/designs/2026/RootLayoutExtras'), {
  ssr: false,
});
const legacyFonts =
  'https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Gowun+Batang:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap';

export default function RootLayoutExtras() {
  const { theme } = useDesignTheme();
  if (theme === 'sweet-home') {
    return null;
  }
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={legacyFonts} precedence="legacy-fonts" />
      {theme === 'cloud' && (
        <div className="legacy-cloud-background" aria-hidden="true">
          <RootLayoutExtras2026 />
        </div>
      )}
    </>
  );
}
