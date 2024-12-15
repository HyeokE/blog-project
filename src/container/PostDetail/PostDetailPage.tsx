'use client';
import React from 'react';

import NotionView from '@/components/NotionView';
import { motion } from 'framer-motion';
import type { PostDetailResponse } from '@/utils/notion/getPageDetail';
import { format } from 'date-fns';

const PostDetailPage = ({ post }: { post: PostDetailResponse }) => {
  return (
    <article className="flex flex-col gap-6 w-full mw-[512px] px-5 mx-auto py-16">
      <div className="max-w-[712px] mx-auto w-full">
        <motion.h1 layout layoutId={post.title} className="text-3xl text-gray-900 font-bold">
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
