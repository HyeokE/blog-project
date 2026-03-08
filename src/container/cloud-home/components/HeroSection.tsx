'use client';

import { motion, useSpring, useTransform } from 'motion/react';
import Link from 'next/link';
import { useEffect } from 'react';

const DESCRIPTION = 'A collection of writings on code, life.';

const DESCRIPTION_INVERT_MASK = {
  WebkitMaskImage:
    'radial-gradient(ellipse 16rem 8rem at 50% 128%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 34%, rgba(0, 0, 0, 0.72) 52%, rgba(0, 0, 0, 0) 72%)',
  maskImage:
    'radial-gradient(ellipse 16rem 8rem at 50% 128%, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 34%, rgba(0, 0, 0, 0.72) 52%, rgba(0, 0, 0, 0) 72%)',
} as const;

const SKY_BOTTOM_MASK = {
  WebkitMaskImage:
    'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
  maskImage:
    'linear-gradient(to bottom, black 0%, black 82%, transparent 100%)',
} as const;

const REFLECTION_MASK = {
  WebkitMaskImage: [
    'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 8%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0.46) 72%, rgba(0, 0, 0, 0) 100%)',
    'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.38) 8%, rgba(0, 0, 0, 0.96) 18%, rgba(0, 0, 0, 0.96) 82%, rgba(0, 0, 0, 0.38) 92%, rgba(0, 0, 0, 0) 100%)',
  ].join(', '),
  WebkitMaskComposite: 'source-in',
  maskImage: [
    'linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 8%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0.46) 72%, rgba(0, 0, 0, 0) 100%)',
    'linear-gradient(to right, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.38) 8%, rgba(0, 0, 0, 0.96) 18%, rgba(0, 0, 0, 0.96) 82%, rgba(0, 0, 0, 0.38) 92%, rgba(0, 0, 0, 0) 100%)',
  ].join(', '),
  maskComposite: 'intersect',
} as const;

const SAFARI_BLUR_FIX = {
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
} as const;

export const HeroSection = () => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const riseProgress = useSpring(0, {
    stiffness: 72,
    damping: 18,
    mass: 1.02,
  });

  useEffect(() => {
    riseProgress.set(1);
  }, [riseProgress]);

  const sunY = useTransform(riseProgress, [0, 1], [44, -132]);
  const sunOpacity = useTransform(riseProgress, [0, 1], [0.78, 1]);
  const reflectionY = useTransform(riseProgress, [0, 1], [-24, 0]);
  const reflectionOpacity = useTransform(riseProgress, [0, 1], [0.36, 0.72]);

  return (
    <section className="relative flex min-h-[100svh] w-full snap-center items-center justify-center overflow-hidden px-4 sm:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[56%] md:h-[55%]" style={SKY_BOTTOM_MASK}>
          <div className="absolute bottom-0 left-1/2 h-[18rem] w-[18rem] -translate-x-1/2 translate-y-[46%] sm:h-[21rem] sm:w-[21rem] md:h-[24rem] md:w-[24rem]">
            <motion.div style={{ y: sunY, opacity: sunOpacity }} className="relative h-full w-full">
              <div style={SAFARI_BLUR_FIX} className="absolute inset-0 rounded-full bg-[#cf3f36]/40 blur-[92px] dark:bg-[#d8a63d]/22" />
              <div style={SAFARI_BLUR_FIX} className="absolute top-1/2 left-1/2 h-28 w-[20rem] -translate-x-1/2 -translate-y-[8%] rounded-full bg-[#d85f53]/16 blur-[42px] sm:h-32 sm:w-[24rem] md:h-36 md:w-[32rem] dark:bg-[#d8a63d]/14" />
              <div style={SAFARI_BLUR_FIX} className="absolute top-1/2 left-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d85f53]/90 blur-[12px] sm:h-48 sm:w-48 md:h-56 md:w-56 dark:bg-[#f1c35f]/42" />
            </motion.div>
          </div>
        </div>

        {/* Reflection */}
        <div
          className="absolute top-[52%] bottom-[7%] left-1/2 w-[92vw] max-w-[62rem] -translate-x-1/2 md:top-[51%] md:w-[88vw]"
          style={REFLECTION_MASK}
        >
          <motion.div
            style={{ y: reflectionY, opacity: reflectionOpacity }}
            className="absolute inset-x-0 top-0"
          >
            <div style={SAFARI_BLUR_FIX} className="absolute top-0 left-1/2 h-[26rem] w-[20rem] -translate-x-1/2 blur-[68px] sm:h-[30rem] sm:w-[24rem] md:h-[34rem] md:w-[28rem]">
              <div className="h-full w-full bg-[radial-gradient(ellipse_46%_68%_at_50%_0%,_rgba(216,95,83,0.44)_0%,_rgba(216,95,83,0.22)_22%,_rgba(216,95,83,0.06)_52%,_rgba(216,95,83,0)_82%)] dark:bg-[radial-gradient(ellipse_46%_68%_at_50%_0%,_rgba(232,191,92,0.3)_0%,_rgba(232,191,92,0.14)_22%,_rgba(232,191,92,0.04)_52%,_rgba(232,191,92,0)_82%)]" />
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 -translate-y-8 text-center md:-translate-y-16"
      >
        <p className="font-serif-home text-foreground/55 mb-3 text-[11px] tracking-[0.18em] uppercase italic sm:mb-4 sm:text-sm sm:tracking-[0.22em]">
          {today}
        </p>
        <h1 className="font-serif-home uppercase text-foreground mx-auto max-w-[11ch] text-[3.35rem] leading-[0.86] font-medium italic sm:max-w-none sm:text-6xl md:text-7xl">
          ABOVE THE CLOUDS
        </h1>

        <div className="relative mx-auto mt-5 max-w-[22rem] sm:mt-6 sm:max-w-[34rem]">
          <p className="text-brand-400 uppercase dark:text-brand-400 whitespace-normal text-balance text-sm leading-7 sm:text-base sm:leading-8 md:text-lg">
            {DESCRIPTION}
          </p>
          
        </div>

        <Link
          href="/about-design"
          className="border-foreground/15 text-foreground hover:border-foreground/25 mt-6 inline-flex rounded-full border px-5 py-3 text-[11px] tracking-[0.14em] uppercase backdrop-blur-md transition-colors sm:mt-8 sm:px-6 sm:text-xs sm:tracking-[0.16em]"
        >
          About Design
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.9 }}
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center sm:bottom-10"
      >
        <span className="text-foreground/45 mb-2 text-[10px] tracking-[0.22em] uppercase sm:tracking-[0.26em]">
          Scroll
        </span>
        <div className="from-foreground/30 h-10 w-px bg-gradient-to-b to-transparent sm:h-14" />
      </motion.div>
    </section>
  );
};
