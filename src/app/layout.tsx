import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PointerRoot } from '@/components/Pointer/Pointer';
import { GoogleAnalytics } from '@next/third-parties/google';
import { NavDock } from '@/components/NavDock';

export const metadata: Metadata = {
  title: 'HYEOK DEV',
  description: '소프트웨어 엔지니어 HYEOK의 블로그 입니다.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css"
          rel="stylesheet"
        />
        <GoogleAnalytics gaId="G-07RYXQL1X0" />
      </head>

      <body>
        <PointerRoot>
          <>
            {children}
            <NavDock />
          </>
        </PointerRoot>
      </body>
    </html>
  );
}
