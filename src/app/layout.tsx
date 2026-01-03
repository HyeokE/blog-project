import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PointerRoot } from '@/components/Pointer/Pointer';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/react';
import { NavDock } from '@/components/NavDock';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DarkModeProvider } from '@/context/DarkModeContext';
import OverlayProvider from '@/context/OverlayProvider';
import { LayoutGroup } from 'motion/react';
import { SilkBackground } from '@/components/SilkBackground';

export const revalidate = 3600;

// 기본 메타데이터는 defaultLocale에서 가져옵니다

export const metadata: Metadata = {
  title: 'HYEOK.DEV',
  description: 'HYEOK.DEV',
  metadataBase: new URL('https://hyeok.dev'),
  openGraph: {
    title: 'HYEOK.DEV',
    description: '소프트웨어 엔지니어 Jason의 블로그입니다.',
    type: 'website',
    locale: 'ko_KR',
    siteName: 'HYEOK',
  },
  twitter: {
    title: 'HYEOK.DEV',
    description: '소프트웨어 엔지니어 Jason의 블로그입니다.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Gowun+Batang:wght@400;700&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap"
          rel="stylesheet"
        />
        <meta name="naver-site-verification" content="6db56d77a544952e591331d6016ed98ce862c631" />
      </head>

      <body suppressHydrationWarning>
        <GoogleAnalytics gaId="G-07RYXQL1X0" />
        <Analytics />
        <SpeedInsights />
        <SilkBackground />
        <div id="portal-root" />
        <OverlayProvider>
          <DarkModeProvider defaultMode="light">
            <PointerRoot>
              <LayoutGroup>
                {children}
                <NavDock />
                {/* <p className="text-foreground fixed right-4 bottom-4 text-sm">
                  ©{new Date().getFullYear()}. Jason Jeong
                </p> */}
              </LayoutGroup>
            </PointerRoot>
          </DarkModeProvider>
        </OverlayProvider>
      </body>
    </html>
  );
}
