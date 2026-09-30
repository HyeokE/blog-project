'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Moon, Sun } from 'lucide-react';
import { ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import { useDarkMode } from '@/context/DarkModeContext';
import WallMenu from './WallMenu';

type Props = {
  variant: 'viewport' | 'document';
  search?: ReactNode;
  account?: ReactNode;
  trailing?: ReactNode;
  showMenu?: boolean;
};

export default function WallChrome({ variant, search, account, trailing, showMenu = true }: Props) {
  const { mode, toggleMode } = useDarkMode();
  const dark = mode === 'dark';
  return (
    <>
      <header className="wall-header" data-chrome-variant={variant}>
        <Link
          data-analytics-label={ANALYTICS_ELEMENTS.HOME_LINK}
          data-analytics-section={ANALYTICS_SECTIONS.HEADER}
          data-analytics-id="home"
          href="/"
          className="wall-wordmark"
          aria-label="HYEOK.DEV 홈"
        >
          HYEOK<span>.</span>
        </Link>
        <div className="wall-header-actions">
          {search}
          <button
            className="wall-header-icon-button"
            data-analytics-label={ANALYTICS_ELEMENTS.COLOR_MODE_TOGGLE}
            data-analytics-section={ANALYTICS_SECTIONS.HEADER}
            type="button"
            onClick={toggleMode}
            aria-label={dark ? '밝은 조명으로 전환' : '어두운 조명으로 전환'}
          >
            {dark ? <Sun size={18} strokeWidth={1.5} /> : <Moon size={18} strokeWidth={1.5} />}
          </button>
          {account}
        </div>
      </header>
      {(showMenu || trailing) && <footer className="wall-footer" data-chrome-variant={variant}>
        {showMenu && <WallMenu />}
        {trailing}
      </footer>}
    </>
  );
}
