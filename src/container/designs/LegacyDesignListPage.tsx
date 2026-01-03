'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

const legacyDesigns = [
  {
    year: 2025,
    title: 'Design 2025',
    description: 'Retro Design',
  },
];

export default function LegacyDesignListPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-20">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <div className="mb-16 text-center">
            <div className="mb-4 h-px w-12 mx-auto bg-[#4a4a4a]/20" />
            <h1 className="font-serif-home mb-2 text-4xl text-[#3a3a3a] italic">
              Legacy Designs
            </h1>
            <p className="text-sm text-[#8a8a8a] tracking-wide">
              과거 디자인 아카이브
            </p>
          </div>

          {/* Design Cards */}
          <div className="mb-16 space-y-4">
            {legacyDesigns.map((design) => (
              <Link
                key={design.year}
                href={`/${design.year}`}
                className="group block border-b border-[#e0e0e0] pb-6 pt-6 first:pt-0 transition-colors hover:border-[#4a4a4a]/40"
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-baseline gap-3">
                      <span className="text-xs tracking-widest text-[#8a8a8a] uppercase">
                        {design.year}
                      </span>
                      <span className="h-px w-6 bg-[#d0d0d0]" />
                    </div>
                    <h2 className="font-serif-home mb-1 text-2xl text-[#3a3a3a] italic transition-colors group-hover:text-[#2a2a2a]">
                      {design.title}
                    </h2>
                    <p className="text-sm text-[#6a6a6a]">{design.description}</p>
                  </div>
                  <span className="ml-4 text-[#8a8a8a] transition-all duration-300 group-hover:translate-x-1 group-hover:text-[#4a4a4a]">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-6 border-t border-[#e0e0e0] pt-8">
            <Link
              href="/"
              className="group flex items-center gap-2 text-sm text-[#6a6a6a] transition-colors hover:text-[#3a3a3a]"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              <span>Blog</span>
            </Link>
            <div className="h-4 w-px bg-[#d0d0d0]" />
            <Link
              href="/about-design"
              className="group flex items-center gap-2 text-sm text-[#6a6a6a] transition-colors hover:text-[#3a3a3a]"
            >
              <span>About Design</span>
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


