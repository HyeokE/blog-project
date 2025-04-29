'use client';
import { Dock, type DockItem } from '@/components/Dock';
import { HomeIcon } from '@/assets/HomeIcon';
import { UserIcon } from '@/assets/UserIcon';
import { GalleryIcon } from '@/assets/GalleryIcon';
import { SparklesIcon } from '@/assets/SparklesIcon';
import { SunIcon } from '@/assets/SunIcon';
import useDarkMode from '@/hooks/useDarkMode';
import { useTranslation } from '@/hooks/useTranslation';

export function NavDock() {
  const { t } = useTranslation();
  const [mode, toggleMode] = useDarkMode('light');

  // 경로 생성 함수: 한국어는 루트 경로, 영어는 /en 경로 사용
  const getPath = (path: string) => {
    // if (locale === defaultLocale) {
      return path; // 한국어인 경우 그대로 사용
    // } else {
    //   return `/${locale}${path}`; // 영어인 경우 /en 접두사 추가
    // }
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
        <Dock items={items} desktopClassName="mx-auto w-fit" mobileClassName="mx-auto w-fit" />
      </div>
    </div>
  );
}
