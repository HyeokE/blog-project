'use client';
import type { MotionValue } from 'motion/react';
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MenuIcon } from '@/assets/MenuIcon';

export type DockItem = {
  title: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Dock = ({
  items,
  desktopClassName,
  mobileClassName,
}: {
  items: DockItem[];
  desktopClassName?: string;
  mobileClassName?: string;
}) => {
  return (
    <>
      <FloatingDockDesktop items={items} className={desktopClassName} />
      <FloatingDockMobile items={items} className={mobileClassName} />
    </>
  );
};

const FloatingDockMobile = ({ items, className }: { items: DockItem[]; className?: string }) => {
  const [open, setOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지를 위한 useEffect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dockRef.current && !dockRef.current.contains(event.target as Node) && open) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  // dock item 클릭 핸들러
  const handleItemClick = (item: DockItem) => {
    if (item.onClick) {
      item.onClick();
    }
    setOpen(false);
  };

  return (
    <div className={cn('tablet:hidden relative block', className)} ref={dockRef}>
      <AnimatePresence>
        {open && (
          <>
            {/* 블러 오버레이 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-10 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              layoutId="nav"
              className="absolute inset-x-0 bottom-full z-20 mb-2 flex flex-col gap-2"
            >
              {items.map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 10,
                    transition: {
                      delay: idx * 0.05,
                    },
                  }}
                  transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                >
                  {item.href ? (
                    <Link
                      href={item.href}
                      key={item.title}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-900"
                      onClick={() => setOpen(false)}
                    >
                      <div className="h-fit w-fit">{item.icon}</div>
                    </Link>
                  ) : (
                    <button
                      key={item.title}
                      onClick={() => handleItemClick(item)}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-gray-50 dark:bg-neutral-900"
                    >
                      <div className="h-fit w-fit">{item.icon}</div>
                    </button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        whileTap={{ scale: 0.95 }}
        className="relative z-20 flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 shadow-md transition-all dark:bg-neutral-800"
        animate={{
          backgroundColor: open ? 'var(--foreground)' : 'var(--background)',
          color: open ? 'var(--background)' : 'var(--foreground)',
        }}
      >
        <div className="flex h-6 w-6 items-center justify-center">
          <MenuIcon
            isOpen={open}
            onClick={() => {
              setOpen(!open);
            }}
          />
        </div>
      </motion.button>
    </div>
  );
};

const FloatingDockDesktop = ({ items, className }: { items: DockItem[]; className?: string }) => {
  const mouseX = useMotionValue(Infinity);
  return (
    <motion.div
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      className={cn(
        'tablet:flex mx-auto hidden h-16 items-end gap-4 rounded-2xl border-b-blue-400 bg-gray-50 px-4 pb-3 dark:bg-neutral-900',
        className,
      )}
    >
      {items.map((item) => (
        <IconContainer mouseX={mouseX} key={item.title} {...item} />
      ))}
    </motion.div>
  );
};

function IconContainer({ mouseX, title, icon, href, onClick }: { mouseX: MotionValue } & DockItem) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };

    return val - bounds.x - bounds.width / 2;
  });

  const widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
  const heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);

  const widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
  const heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);

  const width = useSpring(widthTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const height = useSpring(heightTransform, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const widthIcon = useSpring(widthTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });
  const heightIcon = useSpring(heightTransformIcon, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  const [hovered, setHovered] = useState(false);

  return (
    <>
      {href ? (
        <Link href={href}>
          <motion.div
            ref={ref}
            style={{ width, height }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className="relative flex aspect-square items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-800"
          >
            <AnimatePresence>
              {hovered && (
                <motion.div
                  initial={{ opacity: 0, y: 10, x: '0%' }}
                  animate={{ opacity: 1, y: 0, x: '0%' }}
                  exit={{ opacity: 0, y: 2, x: '0%' }}
                  className="absolute bottom-full left-1/2 mb-2 w-fit -translate-x-1/2 rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs whitespace-pre text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white"
                >
                  {title}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div
              style={{ width: widthIcon, height: heightIcon }}
              className="flex items-center justify-center"
            >
              {icon}
            </motion.div>
          </motion.div>
        </Link>
      ) : (
        <motion.div
          ref={ref}
          style={{ width, height }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={onClick}
          className="relative flex aspect-square items-center justify-center rounded-full bg-gray-200 dark:bg-neutral-800"
        >
          <AnimatePresence>
            {hovered && (
              <motion.div
                initial={{ opacity: 0, y: 10, x: '0%' }}
                animate={{ opacity: 1, y: 0, x: '0%' }}
                exit={{ opacity: 0, y: 2, x: '0%' }}
                className="absolute bottom-full left-1/2 mb-2 w-fit -translate-x-1/2 rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs whitespace-pre text-neutral-700 dark:border-neutral-900 dark:bg-neutral-800 dark:text-white"
              >
                {title}
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            style={{ width: widthIcon, height: heightIcon }}
            className="flex items-center justify-center"
          >
            {icon}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
