'use client';

import { useScrollContext } from '@/context/ScrollContext';
import { useMotionValue } from 'motion/react';
import { useEffect, useRef } from 'react';

export function useSectionScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const containerRef = useScrollContext();
  const scrollYProgress = useMotionValue(0);

  useEffect(() => {
    const container = containerRef?.current;
    const target = ref.current;

    if (!container || !target) {
      return;
    }

    let frameId = 0;

    const update = () => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const totalDistance = containerRect.height + targetRect.height;
      const progress =
        totalDistance === 0 ? 0 : (containerRect.bottom - targetRect.top) / totalDistance;

      scrollYProgress.set(Math.min(1, Math.max(0, progress)));
      frameId = 0;
    };

    const requestUpdate = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(update);
    };

    requestUpdate();

    const resizeObserver = new ResizeObserver(requestUpdate);
    resizeObserver.observe(container);
    resizeObserver.observe(target);

    container.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver.disconnect();
      container.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [containerRef, scrollYProgress]);

  return { ref, scrollYProgress };
}
