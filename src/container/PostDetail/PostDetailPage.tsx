'use client';
import React from 'react';

import NotionView from '@/components/NotionView';
import { motion } from 'framer-motion';
import type { PostDetailResponse } from '@/utils/notion/getPageDetail';
import { format } from 'date-fns';

const PostDetailPage = ({ post }: { post: PostDetailResponse }) => {
  return (
    <article className="mw-[512px] mx-auto flex w-full flex-col gap-6 px-5 py-16">
      <div className="mx-auto flex w-full max-w-[712px] flex-col gap-3">
        <motion.h1 className="text-3xl font-bold text-gray-900 dark:text-gray-200">
          {post.title}
        </motion.h1>
        <motion.time
          layout
          layoutId={post.date.start_date}
          className="text-sm text-gray-600 dark:text-gray-400"
        >
          {format(post.date.start_date, 'yyyy.MM.dd')}
        </motion.time>
      </div>
      <NotionView recordMap={post.recordMap} />
    </article>
  );
};

export default PostDetailPage;
