'use client';

import { useEffect, useRef, useState } from 'react';
import { animate, useMotionValue } from 'motion/react';
import ProjectedWindowFallback from './ProjectedWindowFallback';
import './initial-light-reveal.css';

const DAWN_DURATION_MS = 2000;
const EXIT_DURATION_MS = 600;
const MINIMUM_VISIBLE_MS = 2000;

/** One SSR light layer through the entire intro, revealed after hydration and font readiness. */
export default function InitialLightReveal() {
  const rootRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [phase, setPhase] = useState<'waiting' | 'revealing' | 'leaving' | 'hidden'>('waiting');

  useEffect(() => {
    const readMode = () =>
      setMode(document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light');
    readMode();
    const observer = new MutationObserver(readMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mode'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let disposed = false;
    let hydrated = document.documentElement.dataset.appHydrated === 'true';
    let fontsReady = false;
    let painted = false;
    let paintScheduled = false;
    let dawnComplete = false;
    let motionStarted = false;
    let exitScheduled = false;
    let exitTimer = 0;
    let minimumTimer = 0;
    let fading = false;
    const frames = new Set<number>();
    let animation: ReturnType<typeof animate> | undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const appearedAt = performance.getEntriesByType('paint')[0]?.startTime ?? performance.now();
    const minimumRevealAt = appearedAt + MINIMUM_VISIBLE_MS;
    const afterPaints = (callback: () => void) => {
      const first = requestAnimationFrame(() => {
        frames.delete(first);
        const second = requestAnimationFrame(() => {
          frames.delete(second);
          if (!disposed) {
            callback();
          }
        });
        frames.add(second);
      });
      frames.add(first);
    };
    const beginFade = () => {
      if (disposed || fading) {
        return;
      }
      fading = true;
      setPhase('leaving');
      exitTimer = window.setTimeout(() => setPhase('hidden'), reduceMotion ? 80 : EXIT_DURATION_MS);
    };
    const fadeOut = () => {
      // Paint the same final SVG as the blog before revealing its content.
      afterPaints(() => {
        minimumTimer = window.setTimeout(
          beginFade,
          Math.max(0, minimumRevealAt - performance.now()),
        );
      });
    };
    const revealWhenReady = () => {
      if (disposed || exitScheduled || !painted || !dawnComplete) {
        return;
      }
      exitScheduled = true;
      fadeOut();
    };
    const startDawn = () => {
      if (disposed || motionStarted) {
        return;
      }
      motionStarted = true;
      setPhase('revealing');
      if (reduceMotion) {
        progress.set(1);
        dawnComplete = true;
        revealWhenReady();
        return;
      }
      // One uninterrupted curve. Never jump ahead when hydration arrives late.
      animation = animate(progress, 1, {
        duration: DAWN_DURATION_MS / 1000,
        ease: [0.4, 0, 0.2, 1],
        onComplete: () => {
          dawnComplete = true;
          revealWhenReady();
        },
      });
    };
    // Keep the server-rendered light layer for the entire intro; no renderer swap.
    afterPaints(startDawn);
    const readyForPaint = () => {
      if (disposed || paintScheduled || !hydrated || !fontsReady) {
        return;
      }
      paintScheduled = true;
      afterPaints(() => {
        painted = true;
        revealWhenReady();
      });
    };
    const onHydrated = () => {
      hydrated = true;
      readyForPaint();
    };
    if (!hydrated) {
      window.addEventListener('app:hydrated', onHydrated, { once: true });
    }

    void document.fonts.ready.then(
      () => {
        fontsReady = true;
        readyForPaint();
      },
      () => {
        fontsReady = true;
        readyForPaint();
      },
    );

    return () => {
      disposed = true;
      animation?.stop();
      window.removeEventListener('app:hydrated', onHydrated);
      window.clearTimeout(exitTimer);
      window.clearTimeout(minimumTimer);
      frames.forEach(cancelAnimationFrame);
    };
  }, [progress]);

  if (phase === 'hidden') {
    return null;
  }

  return (
    <div
      ref={rootRef}
      className="initial-light-reveal"
      data-phase={phase}
      data-renderer="svg"
      aria-hidden="true"
    >
      <div className="initial-light-reveal__fallback">
        <ProjectedWindowFallback progress={progress} mode={mode} />
      </div>
      <span className="initial-light-reveal__glyph">HYEOK<span>.</span></span>
    </div>
  );
}
