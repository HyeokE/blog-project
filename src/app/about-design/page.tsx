'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { AirplaneWindow } from '@/components/airplane-window';

export default function AboutDesignPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-20">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-col gap-16 md:flex-row md:items-center md:gap-20">
          <div className="flex flex-col items-center">
            <AirplaneWindow size="about" />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.0, duration: 0.8 }}
              className="mt-4 text-xs tracking-widest text-muted-foreground uppercase"
            >
              Pantone 11-4201 TCX
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2.2, duration: 0.8 }}
              className="font-serif-home mt-1 text-lg font-medium text-card-foreground"
            >
              Cloud Dancer
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex-1"
          >
            <h1 className="font-serif-home mb-6 text-4xl font-semibold text-foreground italic md:text-5xl">
              Cloud Dancer.
            </h1>
            <div className="space-y-6 leading-relaxed text-muted-foreground">
              <p className="font-serif-home text-lg text-card-foreground italic">
                Inspired by Pantone 2026 Color of the Year, Cloud Dancer.
              </p>
              <div className="my-6 h-px w-12 bg-border" />
              <p>
                올해의 블로그 디자인은 Pantone 2026 Color of the Year,{' '}
                <span className="font-serif-home italic">Cloud Dancer</span>에서 영감을 받았습니다.
              </p>
            </div>

            {/* Navigation Links */}
            <div className="mt-12 flex items-center gap-8 border-t border-border pt-8">
              <Link
                href="/"
                className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="transition-transform group-hover:-translate-x-1">←</span>
                <span>Blog</span>
              </Link>
              <div className="h-4 w-px bg-border" />
              <Link
                href="/designs"
                className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span>Legacy Designs</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
