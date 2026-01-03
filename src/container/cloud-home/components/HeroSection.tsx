'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

export const HeroSection = () => {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative flex min-h-screen w-full snap-center flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2 }}
        className="text-center"
      >
        <div className="mx-auto mb-8 h-px w-8 bg-[#4a4a4a]/20" />
        <p className="font-serif-home mb-3 text-sm tracking-[0.2em] text-[#8a8a8a] uppercase italic">
          {today}
        </p>
        <h1 className="font-serif-home mb-4 text-4xl italic font-black text-[#3a3a3a] md:text-5xl">
          Above the Clouds
        </h1>
        <p className="mx-auto max-w-md leading-relaxed font-light text-[#6a6a6a]">
          A collection of writings on code, life, and the quiet spaces in between.
        </p>
        <div className="mx-auto mt-8 h-px w-8 bg-[#4a4a4a]/20" />
        <Link
          href="/about-design"
          className="mt-6 inline-block text-xs tracking-wide text-[#9a9a9a] transition-colors hover:text-[#6a6a6a]"
        >
          About Design →
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center"
      >
        <span className="mb-2 text-[10px] tracking-widest text-[#8a8a8a] uppercase">Scroll</span>
        <div className="h-12 w-px bg-gradient-to-b from-[#4a4a4a]/40 to-transparent" />
      </motion.div>
    </div>
  );
};
