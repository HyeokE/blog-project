'use client';
import React from 'react';
import { itemVariants } from '@/motions/delayChildren';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { NotionPost } from '@/models/NotionPosts';

type PostCard = {
  post: NotionPost;
};

const PostCard = ({ post }: PostCard) => {
  return (
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
      <Link key={post.id} href={`/${post.id}`} className="max-w-[600px]:gap-1 flex flex-col gap-2">
        <motion.time
          className="text-sm text-brand-500 dark:text-gray-400"
          layout
          layoutId={post.date.start_date}
        >
          {format(post.date.start_date, 'dd')}일
        </motion.time>
        <motion.h2
          className="line-clamp-1 text-xl text-brand-600 dark:text-brand-100 font-bold max-[600px]:text-lg"
          layoutId={post.title}
          layout
        >
          {post.title}
        </motion.h2>
        <div className="flex flex-col gap-0.5">
          <motion.p className="line-clamp-1 text-base text-brand-500 max-[600px]:text-sm dark:text-gray-400">
            {post.summary}
          </motion.p>
        </div>
      </Link>
    </motion.div>
  );
};

export default PostCard;
