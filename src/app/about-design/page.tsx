'use client';

import { motion } from 'motion/react';
import Link from 'next/link';

export default function AboutDesignPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-col gap-16 md:flex-row md:items-center md:gap-20"
        >
          <div className="flex flex-col items-center">
            <div
              className="h-72 w-48 rounded-sm shadow-lg md:h-80 md:w-56 bg-cloud-dancer"
            />
            <p className="mt-4 text-xs tracking-widest text-[#8a8a8a] uppercase">
              Pantone 11-4201 TCX
            </p>
            <p className="font-serif-home mt-1 text-lg font-medium text-[#4a4a4a]">Cloud Dancer</p>
          </div>

          <div className="flex-1">
            <h1 className="font-serif-home mb-6 text-4xl font-semibold italic text-[#3a3a3a] md:text-5xl">
            Cloud Dancer.
            </h1>
            <div className="space-y-6 leading-relaxed text-[#5a5a5a]">
              <p className="font-serif-home text-lg text-[#4a4a4a] italic">
                Inspired by Pantone 2026 Color of the Year, Cloud Dancer.
              </p>
              <p>
                This blog is designed with warmth and comfort in mind—like walking on soft clouds. A
                quiet space to slow down and breathe.
              </p>
              <div className="my-6 h-px w-12 bg-[#d0d0d0]" />
              <p>
                올해의 블로그 디자인은 Pantone 2026 Color of the Year,{' '}
                <span className="font-serif-home italic">Cloud Dancer</span>에서 영감을 받았습니다.
              </p>
              <p>포근한 구름 위를 걷는 듯한 편안함을 경험하길 바랍니다.</p>
            </div>
            
            {/* Navigation Links */}
            <div className="mt-12 flex items-center gap-8 border-t border-[#e0e0e0] pt-8">
              <Link
                href="/"
                className="group flex items-center gap-2 text-sm text-[#6a6a6a] transition-colors hover:text-[#3a3a3a]"
              >
                <span className="transition-transform group-hover:-translate-x-1">←</span>
                <span>Blog</span>
              </Link>
              <div className="h-4 w-px bg-[#d0d0d0]" />
              <Link
                href="/designs"
                className="group flex items-center gap-2 text-sm text-[#6a6a6a] transition-colors hover:text-[#3a3a3a]"
              >
                <span>Legacy Designs</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
