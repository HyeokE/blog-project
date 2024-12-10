'use client';
import React, { useRef } from 'react';
import type { NotionPosts } from '@/models/NotionPosts';
import PostGroups from '@/container/home/components/PostGroups';
import { motion, useScroll } from 'framer-motion';
import { itemVariants } from '@/motions/delayChildren';

const PostSection = ({ posts, year }: { posts: NotionPosts; year: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['end end', 'start start'],
  });

  return (
    <motion.div
      variants={itemVariants}
      key={year}
      ref={ref}
      className="relative flex flex-row gap-10 h-fit py-[40px] border-0"
    >
      <h2
        className="sticky text-xl h-fit top-[100px]"
        style={{
          backgroundColor: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        {year}
      </h2>

      <PostGroups groupedPosts={posts} />
    </motion.div>
  );
};

export default PostSection;
