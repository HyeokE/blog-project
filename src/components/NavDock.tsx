'use client';
import { SparklesIcon } from '@/assets/SparklesIcon';
import { SunIcon } from '@/assets/SunIcon';
import { Dock, type DockItem } from '@/components/Dock';
import { HomeIcon } from '@/assets/HomeIcon';
import { UserIcon } from '@/assets/UserIcon';
import { GalleryIcon } from '@/assets/GalleryIcon';
import useDarkMode from '@/hooks/useDarkMode';

export function NavDock() {
  const [mode, toggleMode] = useDarkMode('light');
  const links: DockItem[] = [
    {
      title: 'Home',
      icon: <HomeIcon />,
      href: '/',
    },
    {
      title: '갤러리',
      icon: <GalleryIcon />,
      href: '/gallery',
    },
    {
      title: 'About Me',
      icon: <UserIcon />,
      href: '/about',
    },
    {
      title: 'Change Theme',
      icon: mode === 'dark' ? <SunIcon /> : <SparklesIcon />,
      onClick: toggleMode,
    },
  ];
  return (
    <div className="fixed bottom-0 flex h-fit w-full items-center justify-center py-[20px]">
      <div
        className="from-background absolute inset-0 bg-linear-to-t to-transparent"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0, 0.2))',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, rgba(0,0,0, 0.2))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          opacity: mode === 'dark' ? 0.7 : 1,
        }}
      />
      <Dock items={links} />
    </div>
  );
}
