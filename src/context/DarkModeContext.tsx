'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type DarkModeContextType = {
  mode: string;
  toggleMode: () => void;
};

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme-mode';

export function DarkModeProvider({ 
  children, 
  defaultMode = 'light' 
}: { 
  children: ReactNode;
  defaultMode?: string;
}) {
  const [mode, setMode] = useState(defaultMode);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialMode = savedMode || (prefersDark ? 'dark' : 'light');
    setMode(initialMode);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-mode', mode);
      localStorage.setItem(STORAGE_KEY, mode);
    }
  }, [mode, mounted]);

  const toggleMode = (): void => {
    setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  };

  return (
    <DarkModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  const context = useContext(DarkModeContext);
  
  if (context === undefined) {
    throw new Error('useDarkMode must be used within a DarkModeProvider');
  }
  
  return context;
}
