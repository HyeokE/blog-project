'use client';
import { useEffect, useState } from 'react';

export default function useDarkMode(defaultMode = 'light') {
  const [mode, setMode] = useState(defaultMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  };

  return [mode, toggleMode] as [string, () => void];
}
