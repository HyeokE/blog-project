'use client';

import { useEffect, useState, type RefObject } from 'react';
import dynamic from 'next/dynamic';

const WallLighting = dynamic(() => import('./WallLighting'), { ssr: false });

export default function DeferredWallLighting(props: {
  rootRef: RefObject<HTMLDivElement | null>;
  mode: 'light' | 'dark';
  onReady?: (ready: boolean) => void;
}) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let idle: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Let the readable HTML paint before compiling the decorative shader.
    const frame = requestAnimationFrame(() => {
      if ('requestIdleCallback' in window) {
        idle = window.requestIdleCallback(() => setEnabled(true), { timeout: 800 });
      } else {
        timer = setTimeout(() => setEnabled(true), 100);
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      if (idle !== undefined) {
        window.cancelIdleCallback(idle);
      }
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    };
  }, []);

  return enabled ? <WallLighting {...props} /> : null;
}
