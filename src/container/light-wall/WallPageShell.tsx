'use client';

import type { ReactNode } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import ProjectedWindowFallback from './ProjectedWindowFallback';
import WallChrome from './WallChrome';
import './light-wall.css';
import './wall-pages.css';

export default function WallPageShell({
  children,
  className = '',
  lighting = true,
}: {
  children: ReactNode;
  className?: string;
  lighting?: boolean;
}) {
  const { mode } = useDarkMode();
  const wallMode = mode === 'dark' ? 'dark' : 'light';

  return (
    <div
      className={`light-wall light-page ${className}`}
      data-wall-mode={wallMode}
      data-renderer="svg"
    >
      {lighting && (
        <div className="wall-page-background" aria-hidden="true">
          <ProjectedWindowFallback mode={wallMode} />
        </div>
      )}
      <WallChrome variant="document" trailing={
        <span className="wall-page-colophon">© {new Date().getFullYear()} HYEOK.</span>
      } />
      <main className="wall-page-content">{children}</main>
    </div>
  );
}
