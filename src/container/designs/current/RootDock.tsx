'use client';
import dynamic from 'next/dynamic';
import { useDesignTheme } from '@/context/DesignThemeContext';

const RootDock2026 = dynamic(() => import('@/container/designs/2026/RootDock'));
const RootDock2025 = dynamic(() => import('@/container/designs/2025/RootDock'));
const ThemeSwitcher = dynamic(() => import('@/components/ThemeSwitcher'));

export default function RootDock() {
  const { theme } = useDesignTheme();
  if (theme === 'sweet-home') {
    return null;
  }
  const Dock = theme === '2025' ? RootDock2025 : RootDock2026;
  return (
    <>
      <Dock />
      <ThemeSwitcher />
    </>
  );
}
