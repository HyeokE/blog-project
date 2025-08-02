'use client';
import React from 'react';
import { itemVariants } from '@/motions/delayChildren';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import type { NotionPost } from '@/models/NotionPosts';
import ThumbnailTransition from '@/components/ThumbnailTransition';

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
      <ThumbnailTransition
        key={post.id}
        href={`/${post.id}`}
        title={post.title}
        date={post.date.start_date}
        useTransition
        className="max-w-[600px]:gap-1 flex flex-col gap-2"
      >
        <motion.time
          className="text-brand-500 text-sm dark:text-gray-400"
          layout
          layoutId={post.date.start_date}
        >
          {format(post.date.start_date, 'dd')}일
        </motion.time>
        <motion.h2
          className="text-brand-600 dark:text-brand-100 line-clamp-1 text-xl font-bold max-[600px]:text-lg"
          layoutId={post.title}
          layout
        >
          {post.title}
        </motion.h2>
        <div className="flex flex-col gap-0.5">
          <motion.p className="text-brand-500 line-clamp-1 text-base max-[600px]:text-sm dark:text-gray-400">
            {post.summary}
          </motion.p>
        </div>
      </ThumbnailTransition>
    </motion.div>
  );
};

export default PostCard;
