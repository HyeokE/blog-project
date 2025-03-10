'use client';
import { useEffect, useState } from 'react';

export default function useDarkMode(defaultModeProp = 'light') {
  const [mode, setMode] = useState(defaultModeProp);

  useEffect(() => {
    const defaultMode = document.documentElement.getAttribute('data-mode');
    setMode(defaultMode || defaultModeProp);
  }, [defaultModeProp]);

  useEffect(() => {
    document.documentElement.setAttribute('data-mode', mode);
  }, [mode]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  };

  return [mode, toggleMode] as [string, () => void];
}
