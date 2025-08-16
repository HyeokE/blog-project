import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PointerRoot } from '@/components/Pointer/Pointer';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/react';
import { NavDock } from '@/components/NavDock';
import { defaultLocale, getTranslations } from '@/i18n';
import { headers } from 'next/headers';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DarkModeProvider } from '@/context/DarkModeContext';
import OverlayProvider from '@/context/OverlayProvider';
import { LayoutGroup } from 'motion/react';

// 기본 메타데이터는 defaultLocale에서 가져옵니다
const translations = getTranslations(defaultLocale);

export const metadata: Metadata = {
  title: translations.layout.title,
  description: translations.layout.description,
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

async function getBrowserLanguage(): Promise<string> {
  const headersList = await headers();
  const acceptLanguage = headersList.get('accept-language') || '';
  const preferredLanguage = acceptLanguage.split(',')[0].split('-')[0];
  return ['ko', 'en'].includes(preferredLanguage) ? preferredLanguage : defaultLocale;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const locale = await getBrowserLanguage();

  return (
    <html lang={locale} suppressHydrationWarning>
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
