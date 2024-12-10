'use client';

import React, { useEffect, useState } from 'react';

import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
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
      height: 24,
      width: 24,
      borderRadius: '50%',
      backgroundColor: '#3a7bd5',
      opacity: 0.6,
      x: '-50%', // Add these transform values
      y: '-50%',
    },
    pointer: {
      height: 36,
      width: 36,
      borderRadius: '50%',
      backgroundColor: '#3a7bd5',
      opacity: 0.8,
      x: '-50%',
      y: '-50%',
    },
    text: {
      height: textHeight,
      width: 2,
      borderRadius: 0,
      backgroundColor: '#3a7bd5',
      opacity: 1,
      x: '-50%',
      y: '-50%',
    },
  };

  return (
    <motion.div
      className="fixed pointer-events-none z-50"
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
