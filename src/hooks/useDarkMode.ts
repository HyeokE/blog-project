'use client';
import { useEffect, useState } from 'react';

export default function useDarkMode(defaultModeProp = 'light') {
  const [mode, setMode] = useState(defaultModeProp);

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-mode',
      document.documentElement.getAttribute('data-mode') ?? mode,
    );
  }, [mode]);

  const toggleMode = () => {
    setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  };

  return [mode, toggleMode] as [string, () => void];
}
