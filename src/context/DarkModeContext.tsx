'use client';

import { ANALYTICS_ACTIONS } from '@/constants/analytics';
import { trackInteraction } from '@/utils/analytics';

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';

type DarkModeContextType = {
  mode: string;
  toggleMode: () => void;
};

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme-mode';

export function DarkModeProvider({
  children,
  defaultMode = 'light',
}: {
  children: ReactNode;
  defaultMode?: string;
}) {
  const [mode, setMode] = useState(defaultMode);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    // The pre-paint head script already resolved storage and system preference.
    // Hydrate JS-driven visuals before the browser can paint their default mode.
    const bootstrapMode = document.documentElement.getAttribute('data-mode');
    let savedMode: string | null = bootstrapMode;
    if (savedMode !== 'dark' && savedMode !== 'light') {
      try {
        savedMode = localStorage.getItem(STORAGE_KEY);
      } catch {
        /* Storage may be blocked. */
      }
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode =
      savedMode === 'dark' || savedMode === 'light' ? savedMode : prefersDark ? 'dark' : 'light';
    setMode(initialMode);
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-mode', mode);
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        /* Keep theme usable without storage. */
      }
    }
  }, [mode, mounted]);

  const toggleMode = (): void => {
    trackInteraction(ANALYTICS_ACTIONS.COLOR_MODE_CHANGE, {
      previous_mode: mode,
      next_mode: mode === 'dark' ? 'light' : 'dark',
    });
    setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <DarkModeContext.Provider value={{ mode, toggleMode }}>{children}</DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);

  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }

  return context;
}
