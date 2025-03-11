'use client';

import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

const MenuIcon = ({ isOpen, onClick }: { isOpen?: boolean; onClick?: () => void }) => {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(Boolean(isOpen));
  }, [isOpen]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div className="flex h-6 w-6 items-center justify-center">
      <div className="relative h-4 w-6 cursor-pointer" onClick={handleClick}>
        {/* 상단 막대 */}
        <motion.span
          className="absolute top-0 right-0 left-0 h-0.5 rounded-full bg-current"
          animate={{
            top: isActive ? '50%' : '0%',
            rotate: isActive ? 45 : 0,
            translateY: isActive ? '-50%' : '0%',
          }}
          style={{
            transformOrigin: 'center',
            position: 'absolute',
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
        />

        {/* 중간 막대 */}
        <motion.span
          className="absolute top-1/2 right-0 left-0 h-0.5 -translate-y-1/2 rounded-full bg-current"
          animate={{
            opacity: isActive ? 0 : 1,
            scale: isActive ? 0 : 1,
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
        />

        {/* 하단 막대 */}
        <motion.span
          className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-current"
          animate={{
            bottom: isActive ? '50%' : '0%',
            rotate: isActive ? -45 : 0,
            translateY: isActive ? '50%' : '0%',
          }}
          style={{
            transformOrigin: 'center',
            position: 'absolute',
          }}
          transition={{
            type: 'spring',
            stiffness: 260,
            damping: 20,
          }}
        />
      </div>
    </div>
  );
};

export { MenuIcon };
