'use client';

import { motion, useScroll, useTransform } from 'motion/react';
import Link from 'next/link';
import { useRef, useState, useEffect } from 'react';
import { useScrollContext } from '@/context/ScrollContext';

interface PostCardProps {
  id: string;
  title: string;
  excerpt?: string;
  date: string;
  category?: string;
  slug: string;
}

export const PostCard = ({ id, title, excerpt, date, category }: PostCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useScrollContext();
  const [isMobile, setIsMobile] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const checkReady = () => {
      if (containerRef?.current) {
        setIsReady(true);
      }
    };
    checkReady();
    const timer = setTimeout(checkReady, 100);
    return () => clearTimeout(timer);
  }, [containerRef]);

  const { scrollYProgress } = useScroll({
    target: ref,
    container: isReady && containerRef ? containerRef : undefined,
    offset: ['start end', 'end start'],
  });

  const rotateValue = isMobile ? 2 : 4;
  const xValue = isMobile ? 5 : 10;

  const rotate = useTransform(scrollYProgress, [0, 0.5, 1], [-rotateValue, 0, rotateValue]);
  const x = useTransform(scrollYProgress, [0, 0.5, 1], [-xValue, 0, -xValue]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0.6, 0.85, 1, 0.85, 0.6]);

  const blur = useTransform(scrollYProgress, (v) => {
    const dist = Math.abs(v - 0.5);
    return `blur(${dist * 1.5}px)`;
  });

  return (
    <Link href={`/${id}`} className="m-0">
      <motion.article
        ref={ref}
        style={{
          rotate,
          x,
          scale,
          opacity,
          filter: blur,
        }}
        className="relative mx-auto flex w-full max-w-[90%] cursor-pointer snap-center flex-col rounded-xl backdrop-blur-[2px] transition-colors duration-500 md:max-w-2xl md:py-8"
      >
        <div className="flex h-full transform-gpu flex-col justify-center">
          <div className="mb-2 flex items-center space-x-2 text-[9px] tracking-widest text-[#8a8a8a] uppercase md:space-x-3 md:text-[10px]">
            {category && <span className="font-medium text-[#6a6a6a]">{category}</span>}
            {category && <span className="h-2 w-px bg-[#dcd9d2]" />}
            <span>{date}</span>
          </div>

          <h3 className="font-serif-home mb-2 text-xl leading-tight font-semibold text-[#3a3a3a] md:text-3xl">
            {title}
          </h3>

          {excerpt && (
            <p className="line-clamp-3 max-w-xl text-sm leading-relaxed font-light text-[#6a6a6a] md:text-base">
              {excerpt}
            </p>
          )}

          <div className="mt-4 hidden translate-y-2 transform opacity-0 transition-all duration-300 md:block">
            <span className="border-b border-[#4a4a4a] pb-0.5 text-xs font-medium text-[#4a4a4a]">
              Read more
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
};
