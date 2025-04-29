'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type DarkModeContextType = {
  mode: string;
  toggleMode: () => void;
};

const DarkModeContext = createContext<DarkModeContextType | undefined>(undefined);

export function DarkModeProvider({ 
  children, 
  defaultMode = 'light' 
}: { 
  children: ReactNode;
  defaultMode?: string;
}) {
  const [mode, setMode] = useState(defaultMode);

  useEffect(() => {
    const storedMode = document.documentElement.getAttribute('data-mode');
    if (storedMode) {
      setMode(storedMode);
    }
  }, [defaultMode]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

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
