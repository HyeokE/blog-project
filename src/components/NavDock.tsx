'use client';
import { Dock, type DockItem } from '@/components/Dock';
import { HomeIcon } from '@/assets/HomeIcon';
import { UserIcon } from '@/assets/UserIcon';
import { GalleryIcon } from '@/assets/GalleryIcon';
import { SparklesIcon } from '@/assets/SparklesIcon';
import { SunIcon } from '@/assets/SunIcon';
import useDarkMode from '@/hooks/useDarkMode';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';
import { defaultLocale } from '@/i18n';

export function NavDock() {
  const { t, locale } = useTranslation();
  const [mode, toggleMode] = useDarkMode('light');

  // 경로 생성 함수: 한국어는 루트 경로, 영어는 /en 경로 사용
  const getPath = (path: string) => {
    if (locale === defaultLocale) {
      return path; // 한국어인 경우 그대로 사용
    } else {
      return `/${locale}${path}`; // 영어인 경우 /en 접두사 추가
    }
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
      title: t('common.language'),
      icon: <LanguageIconCustom />,
      onClick: () => {
        // 모달이나 드롭다운으로 언어 선택 UI를 표시할 수 있음
        const languageSwitcherElement = document.getElementById('language-switcher');
        if (languageSwitcherElement) {
          languageSwitcherElement.style.display =
            languageSwitcherElement.style.display === 'none' ? 'block' : 'none';
        }
      },
    },
    {
      title: t('common.theme'),
      icon: mode === 'dark' ? <SunIcon /> : <SparklesIcon />,
      onClick: toggleMode,
    },
  ];

  return (
    <div className="fixed right-0 bottom-5 left-0 z-50">
      <div id="language-switcher" className="mx-auto mb-2 hidden w-fit">
        <LanguageSwitcher />
      </div>
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

// 언어 아이콘만 커스텀 컴포넌트로 사용
const LanguageIconCustom = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M2 12H22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
