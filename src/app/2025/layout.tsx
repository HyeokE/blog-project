'use client';

import { useEffect, type ReactNode } from 'react';

export default function Layout2025({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-design', '2025');
    return () => {
      document.documentElement.removeAttribute('data-design');
    };
  }, []);

  return <>{children}</>;
}
