'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/context/DarkModeContext';
import ProjectedWindowFallback from './ProjectedWindowFallback';
import WallMenu from './WallMenu';
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
  const { mode, toggleMode } = useDarkMode();
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
      <header className="wall-header wall-page-header">
        <Link href="/" className="wall-wordmark" aria-label="HYEOK 홈">
          HYEOK<span>.</span>
        </Link>
        <div className="wall-header-actions">
          <button
            type="button"
            onClick={toggleMode}
            aria-label={wallMode === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {wallMode === 'dark' ? (
              <Sun size={18} strokeWidth={1.2} />
            ) : (
              <Moon size={18} strokeWidth={1.2} />
            )}
          </button>
        </div>
      </header>
      <main className="wall-page-content">{children}</main>
      <footer className="wall-footer wall-page-footer">
        <WallMenu />
        <span className="wall-page-colophon">© {new Date().getFullYear()} HYEOK.</span>
      </footer>
    </div>
  );
}
