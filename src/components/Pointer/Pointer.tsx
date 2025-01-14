'use client';

import React, { useEffect, useState } from 'react';

import { motion, useMotionValue } from 'framer-motion';
import { cn } from '@/components/Dock';
import { usePointer } from '@/components/Pointer/usePointer';

export const PointerRoot = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (rect) {
      x.set(e.clientX);
      y.set(e.clientY);
    }
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      style={{
        cursor: 'none',
      }}
      ref={ref}
      className={cn('relative', className)}
    >
      <Pointer x={x} y={y} />
      {children}
    </div>
  );
};

export const Pointer = ({ x, y }: { x: any; y: any }) => {
  const { cursorVariant, textHeight } = usePointer({ x, y });
  const variants = {
    default: {
      height: 16,
      width: 16,
      borderRadius: 16,
      backgroundColor: '#3a7bd5',
      opacity: 1,
      x: '-50%', // Add these transform values
      y: '-50%',
    },
    pointer: {
      height: 36,
      width: 36,
      borderRadius: 36,
      backgroundColor: '#3a7bd5',
      opacity: 1,
      x: '-50%',
      y: '-50%',
    },
    text: {
      height: textHeight,
      width: 3,
      borderRadius: 4,
      backgroundColor: '#3a7bd5',
      x: '-50%',
      y: '-50%',
    },
  };

  return (
    <motion.div
      className="pointer-events-none fixed z-50 max-[600px]:hidden"
      style={{
        top: y,
        left: x,
      }}
      initial="default"
      variants={variants}
      animate={cursorVariant}
      transition={{
        duration: 0.15,
        ease: 'easeOut',
      }}
    />
  );
};
