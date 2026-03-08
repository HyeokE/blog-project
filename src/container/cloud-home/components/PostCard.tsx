'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

interface PostCardProps {
  id: string;
  title: string;
  excerpt?: string;
  date: string;
  category?: string;
  slug: string;
}

export const PostCard = ({ id, title, excerpt, date, category }: PostCardProps) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        el.toggleAttribute('data-in-view', entry.isIntersecting);
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Link href={`/${id}`} className="m-0 w-full">
      <article
        ref={ref}
        className="post-card relative flex w-full cursor-pointer snap-center flex-col rounded-xl backdrop-blur-[2px] py-8 md:py-8"
      >
        <div className="flex h-full w-full transform-gpu flex-col justify-center">
          <div className="mb-2 flex items-center space-x-2 text-[9px] tracking-widest text-brand-500 uppercase md:space-x-3 md:text-[10px]">
            {category && <span className="font-medium text-brand-600">{category}</span>}
            {category && <span className="h-2 w-px bg-border" />}
            <span>{date}</span>
          </div>

          <h3 className="font-serif-home mb-2 text-xl leading-tight font-semibold text-foreground md:text-2xl">
            {title}
          </h3>

          {excerpt && (
            <p className="line-clamp-3 text-sm leading-relaxed font-light text-muted-foreground md:text-base">
              {excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
};
