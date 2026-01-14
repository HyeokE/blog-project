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
            <div className="mb-4 h-px w-12 mx-auto bg-border" />
            <h1 className="font-serif-home mb-2 text-4xl text-foreground italic">
              Legacy Designs
            </h1>
            <p className="text-sm text-muted-foreground tracking-wide">
              과거 디자인 아카이브
            </p>
          </div>

          {/* Design Cards */}
          <div className="mb-16 space-y-4">
            {legacyDesigns.map((design) => (
              <Link
                key={design.year}
                href={`/${design.year}`}
                className="group block border-b border-border pb-6 pt-6 first:pt-0 transition-colors hover:border-foreground/40"
              >
                <div className="flex items-baseline justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-baseline gap-3">
                      <span className="text-xs tracking-widest text-muted-foreground uppercase">
                        {design.year}
                      </span>
                      <span className="h-px w-6 bg-border" />
                    </div>
                    <h2 className="font-serif-home mb-1 text-2xl text-foreground italic transition-colors group-hover:text-foreground">
                      {design.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">{design.description}</p>
                  </div>
                  <span className="ml-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground">
                    →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-6 border-t border-border pt-8">
            <Link
              href="/"
              className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="transition-transform group-hover:-translate-x-1">←</span>
              <span>Blog</span>
            </Link>
            <div className="h-4 w-px bg-border" />
            <Link
              href="/about-design"
              className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
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


