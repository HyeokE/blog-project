import { LayoutGroup } from 'framer-motion';
import type { Metadata } from 'next';
import './reset.css';
import './globals.css';
import { PointerRoot } from '@/components/Pointer/Pointer';

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.table(process.env);
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css"
          rel="stylesheet"
        />
      </head>
      <body>
        <PointerRoot>{children}</PointerRoot>
      </body>
    </html>
  );
}
