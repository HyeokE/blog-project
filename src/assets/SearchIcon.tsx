'use client';

import { motion, useAnimation } from 'motion/react';
import { clsx } from 'clsx';

type SearchIconProps = {
  onClick?: () => void;
} & React.HTMLAttributes<HTMLDivElement>;

const SearchIcon = ({ onClick, className, ...rest }: SearchIconProps) => {
  const controls = useAnimation();

  return (
    <div
      className={clsx(
        'hover:bg-accent flex cursor-pointer select-none items-center justify-center overflow-hidden rounded-md p-2 transition-colors duration-200',
        className,
      )}
      onMouseEnter={() => controls.start('animate')}
      onMouseLeave={() => controls.start('normal')}
      {...rest}
      onClick={onClick}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          normal: { x: 0, y: 0 },
          animate: {
            x: [0, 0, -3, 0],
            y: [0, -4, 0, 0],
          },
        }}
        transition={{
          duration: 1,
          bounce: 0.3,
        }}
        animate={controls}
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </motion.svg>
    </div>
  );
};

export { SearchIcon };
