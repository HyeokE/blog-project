'use client';
import { SparklesIcon } from '@/assets/SparklesIcon';
import { SunIcon } from '@/assets/SunIcon';
import { Dock, DockItem } from '@/components/Dock';
import { HomeIcon } from '@/assets/HomeIcon';
import { UserIcon } from '@/assets/UserIcon';
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
      title: 'About Me',
      icon: <UserIcon />,
      href: '#',
    },
    {
      title: 'Change Theme',
      icon: mode === 'dark' ? <SunIcon /> : <SparklesIcon />,
      onClick: toggleMode,
    },
  ];
  return (
    <div className="flex fixed bottom-0 h-fit items-center justify-center py-[20px] w-full">
      <div
        className="absolute inset-0 bg-gradient-to-t from-background to-transparent"
        style={{
          maskImage: 'linear-gradient(to bottom, transparent, black)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      />
      <Dock items={links} />
    </div>
  );
}
