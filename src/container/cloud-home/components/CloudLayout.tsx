'use client';

import Link from 'next/link';
import { ScrollContext } from '@/context/ScrollContext';
import { useRef, type ReactNode } from 'react';

interface CloudLayoutProps {
  children: ReactNode;
}

export const CloudLayout = ({ children }: CloudLayoutProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <ScrollContext.Provider value={scrollRef}>
      <div
        ref={scrollRef}
        className="font-sans-home relative h-dvh w-full snap-y snap-mandatory overflow-x-hidden overflow-y-auto scroll-smooth text-foreground selection:bg-brand-300 selection:text-foreground"
      >
        <main className="relative z-10 w-full">{children}</main>

        <footer className="relative z-10 mt-20 snap-center border-t border-border py-16 pb-32">
          <div className="container mx-auto flex flex-col items-center justify-center space-y-6 px-6">
            <h3 className="font-serif-home text-xl text-foreground/60 italic">HYEOK.DEV</h3>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <a
                href="https://github.com/HyeokE"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                GitHub
              </a>
              <Link
                href="/designs"
                className="transition-colors hover:text-foreground"
              >
                Legacy Designs
              </Link>
            </div>
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} Jason Jeong. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </ScrollContext.Provider>
  );
};
