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
        className="font-sans-home relative h-dvh w-full snap-y snap-mandatory overflow-x-hidden overflow-y-auto scroll-smooth text-[#4a4a4a] selection:bg-[#d4cdc4] selection:text-[#2a2a2a]"
      >
        <main className="relative z-10 w-full">{children}</main>

        <footer className="relative z-10 mt-20 snap-center border-t border-[#e5dce5]/20 py-16 pb-32">
          <div className="container mx-auto flex flex-col items-center justify-center space-y-6 px-6">
            <h3 className="font-serif-home text-xl text-[#4a4a4a]/60 italic">HYEOK.DEV</h3>
            <div className="flex space-x-6 text-sm text-[#8a8a8a]">
              <a
                href="https://github.com/HyeokE"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-[#4a4a4a]"
              >
                GitHub
              </a>
              <Link
                href="/designs"
                className="transition-colors hover:text-[#4a4a4a]"
              >
                Legacy Designs
              </Link>
            </div>
            <p className="text-xs text-[#8a8a8a]/60">
              © {new Date().getFullYear()} Jason Jeong. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </ScrollContext.Provider>
  );
};
