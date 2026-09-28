'use client';

import { ANALYTICS_ACTIONS } from '@/constants/analytics';
import { trackInteraction } from '@/utils/analytics';

import { createContext, useContext, useEffect, useLayoutEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getThemePath,
  isDesignTheme,
  resolveDesignTheme,
  type DesignTheme,
} from '@/container/designs/theme';

type DesignThemeContextValue = { theme: DesignTheme; setTheme: (theme: DesignTheme) => void };
const DesignThemeContext = createContext<DesignThemeContextValue | null>(null);

export function DesignThemeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const theme = resolveDesignTheme(pathname);

  useEffect(() => {
    // Initial route and its client providers have committed their hydration.
    document.documentElement.dataset.appHydrated = 'true';
    window.dispatchEvent(new Event('app:hydrated'));
  }, []);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-design', theme);
  }, [theme]);

  const setTheme = (next: DesignTheme) => {
    if (isDesignTheme(next)) {
      trackInteraction(ANALYTICS_ACTIONS.DESIGN_CHANGE, { previous_theme: theme, next_theme: next });
      router.push(getThemePath(pathname ?? '/', next));
    }
  };

  return (
    <DesignThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </DesignThemeContext.Provider>
  );
}

export function useDesignTheme() {
  const context = useContext(DesignThemeContext);
  if (!context) {
    throw new Error('useDesignTheme must be used within DesignThemeProvider');
  }
  return context;
}
