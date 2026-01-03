'use client';
import { Dock, type DockItem } from '@/components/Dock';
import { HomeIcon } from '@/assets/HomeIcon';
import { UserIcon } from '@/assets/UserIcon';
import { GalleryIcon } from '@/assets/GalleryIcon';
import { SparklesIcon } from '@/assets/SparklesIcon';
import { SunIcon } from '@/assets/SunIcon';
import useDarkMode from '@/hooks/useDarkMode';
import { useTranslation } from '@/hooks/useTranslation';
import { usePathname } from 'next/navigation';

export function NavDock() {
  const { t } = useTranslation();
  const [mode, toggleMode] = useDarkMode('light');
  const pathname = usePathname();
  const yearMatch = pathname?.match(/^\/(\d{4})(?:\/|$)/);
  const yearPrefix = yearMatch ? `/${yearMatch[1]}` : '';
  const yearAwarePaths = new Set<string>(['/', '/gallery', '/personal', '/about']);

  // 경로 생성 함수: 한국어는 루트 경로, 영어는 /en 경로 사용
  const getPath = (path: string) => {
    // 연도 컨텍스트가 있으면 연도별 라우트가 존재하는 경로에만 접두사를 붙임
    if (yearPrefix && yearAwarePaths.has(path)) {
      if (path === '/') {
        return `${yearPrefix}`;
      }
      return `${yearPrefix}${path}`;
    }
    return path;
  };

  const items: DockItem[] = [
    {
      title: t('common.home'),
      icon: <HomeIcon />,
      href: getPath('/'),
    },
    {
      title: t('common.about'),
      icon: <UserIcon />,
      href: getPath('/about'),
    },
    {
      title: t('common.gallery'),
      icon: <GalleryIcon />,
      href: getPath('/gallery'),
    },
    {
      title: t('common.theme'),
      icon: mode === 'dark' ? <SunIcon /> : <SparklesIcon />,
      onClick: () => toggleMode(),
    },
  ];

  return (
    <div className="fixed right-0 bottom-5 left-0 z-50">
      <div className="fixed bottom-0 flex h-fit w-full items-center tablet:justify-center py-[20px] px-5">
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
        <Dock items={items} desktopClassName="mx-auto w-fit" mobileClassName="fixed left-4 bottom-4 w-fit" />
      </div>
    </div>
  );
}
