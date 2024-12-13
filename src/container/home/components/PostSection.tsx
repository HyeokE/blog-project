'use client';
import React, { use } from 'react';
import type { NotionPosts } from '@/models/NotionPosts';
import { motion } from 'framer-motion';
import { itemVariants, listVariants } from '@/motions/delayChildren';
import Link from 'next/link';
import { format } from 'date-fns';

interface PostSectionProps {
  posts: NotionPosts;
}

const PostSection = ({ posts }: PostSectionProps) => {
  return (
    <motion.div
      variants={listVariants}
      className="flex flex-col h-fit w-full gap-8 mx-auto py-[calc(50dvh-41px)] px-5"
    >
      {posts.map((post) => (
        <motion.div
          key={post.id}
          variants={itemVariants}
          whileHover={{
            scale: 1.01,
            transition: { duration: 0.2 },
          }}
          className="post-list snap-center"
          data-post-date={post.date.start_date}
        >
          <Link key={post.id} href={`/${post.id}`} className="flex flex-col gap-2">
            <motion.time className="text-sm text-gray-600 dark:text-gray-400">
              {format(post.date.start_date, 'MM.dd')}
            </motion.time>
            <motion.h2 className="text-xl font-bold" layoutId={post.id}>
              {post.title}
            </motion.h2>
            <div className="flex flex-col gap-0.5">
              <motion.p className="line-clamp-1 text-base text-gray-900 dark:text-gray-200">
                {post.summary}
              </motion.p>
            </div>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default PostSection;
