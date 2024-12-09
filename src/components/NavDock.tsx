import { Dock } from '@/components/Dock';
import { HomeIcon } from '@/assets/HomeIcon';
import { UserIcon } from '@/assets/UserIcon';

export function NavDock() {
  const links = [
    {
      title: 'Home',
      icon: <HomeIcon />,
      href: '/',
    },

    {
      title: 'Products',
      icon: <UserIcon />,
      href: '#',
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
