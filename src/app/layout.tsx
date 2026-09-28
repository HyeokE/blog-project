import type { Metadata, Viewport } from 'next';
import './globals.css';
import CurrentPointerRoot from '@/container/designs/current/PointerRoot';
import { DesignThemeProvider } from '@/context/DesignThemeContext';
import GoogleAnalyticsTracker from '@/components/GoogleAnalyticsTracker';
import { Analytics } from '@vercel/analytics/react';
import CurrentRootDock from '@/container/designs/current/RootDock';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { DarkModeProvider } from '@/context/DarkModeContext';
import OverlayProvider from '@/context/OverlayProvider';
import { LayoutGroup } from 'motion/react';
import CurrentLayoutExtras from '@/container/designs/current/RootLayoutExtras';
import InitialLightReveal from '@/container/light-wall/InitialLightReveal';

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
    <html data-design="sweet-home" lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var path = window.location.pathname;
                if (path === '/2025/light') {
                  document.documentElement.setAttribute('data-design', 'sweet-home');
                } else if (path === '/2025' || path.indexOf('/2025/') === 0) {
                  document.documentElement.setAttribute('data-design', '2025');
                } else if (path === '/2026' || path.indexOf('/2026/') === 0) {
                  document.documentElement.setAttribute('data-design', 'cloud');
                }
                var savedMode;
                try { savedMode = localStorage.getItem('theme-mode'); } catch (_) {}
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                var mode = savedMode === 'dark' || savedMode === 'light' ? savedMode : (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-mode', mode);
              })();
            `,
          }}
        />
        <link
          rel="preload"
          href="/fonts/pretendard/PretendardVariable.subset.91.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <meta name="naver-site-verification" content="6db56d77a544952e591331d6016ed98ce862c631" />
      </head>

      <body suppressHydrationWarning>
        <InitialLightReveal />
        <noscript><style>{`.initial-light-reveal { display: none !important; }`}</style></noscript>
        <GoogleAnalyticsTracker />
        <Analytics />
        <SpeedInsights />
        <div id="portal-root" />
        <OverlayProvider>
          <DarkModeProvider defaultMode="light">
            <DesignThemeProvider>
              <CurrentLayoutExtras />
              <CurrentPointerRoot>
                <LayoutGroup>
                  {children}
                  <CurrentRootDock />
                </LayoutGroup>
              </CurrentPointerRoot>
            </DesignThemeProvider>
          </DarkModeProvider>
        </OverlayProvider>
      </body>
    </html>
  );
}
