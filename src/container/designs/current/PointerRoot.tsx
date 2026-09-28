'use client';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useDesignTheme } from '@/context/DesignThemeContext';

const LegacyPointer = dynamic(() => import('./LegacyPointer'), { ssr: false });

export default function CurrentPointerRoot({ children }: { children: ReactNode }) {
  const { theme } = useDesignTheme();
  // Only the cursor is deferred; page content always renders in the initial HTML.
  return theme === 'sweet-home' ? (
    <>{children}</>
  ) : (
    <div className="relative">
      <LegacyPointer />
      {children}
    </div>
  );
}
