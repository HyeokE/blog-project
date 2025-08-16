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

export const revalidate = 3600;

// 기본 메타데이터는 defaultLocale에서 가져옵니다

export const metadata: Metadata = {
  title: 'HYEOK.DEV',
  description: 'HYEOK.DEV',
  metadataBase: new URL('https://hyeok.dev'),
  openGraph: {
    title: 'HYEOK.DEV',
    description: 'HYEOK.DEV',
    images: [
      {
        url: '/opengraph.png',
        width: 1200,
        height: 630,
        alt: 'HYEOK.DEV OpenGraph image',
      },
    ],
    type: 'website',
    locale: 'ko_KR',
    siteName: 'HYEOK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HYEOK.DEV',
    description: 'HYEOK.DEV',
    images: ['/opengraph.png'],
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
          href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css"
          rel="stylesheet"
        />
      </head>

      <body>
        <GoogleAnalytics gaId="G-07RYXQL1X0" />
        <Analytics />
        <SpeedInsights />
        <div id="portal-root" />
        <OverlayProvider>
          <DarkModeProvider defaultMode="light">
            <PointerRoot>
              <LayoutGroup>
                {children}
                <NavDock />
                <p className="text-foreground fixed right-4 bottom-4 text-sm">
                  ©{new Date().getFullYear()}. Jason Jeong All rights reserved.
                </p>
              </LayoutGroup>
            </PointerRoot>
          </DarkModeProvider>
        </OverlayProvider>
      </body>
    </html>
  );
}
