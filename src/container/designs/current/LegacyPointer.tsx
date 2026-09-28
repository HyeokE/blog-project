'use client';

import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import { Pointer } from '@/components/Pointer/Pointer';

export default function LegacyPointer() {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  useEffect(() => {
    const update = (event: MouseEvent) => {
      x.set(event.clientX);
      y.set(event.clientY);
    };
    document.addEventListener('mousemove', update, { capture: true, passive: true });
    return () => document.removeEventListener('mousemove', update, true);
  }, [x, y]);
  return <Pointer x={x} y={y} />;
}
