'use client';

import type { ReactNode } from 'react';

// Loaded with ssr:false so descendants only request same-origin data in the browser.
export default function ClientOnlyShadeWorkspace({ children }: { children: ReactNode }) {
  return children;
}
