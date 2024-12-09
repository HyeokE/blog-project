'use client';
import React from 'react';
import * as motion from 'motion/react-client';
import Link from 'next/link';
import { format } from 'date-fns';
import type { NotionPosts } from '@/models/NotionPosts';
import { itemVariants, listVariants } from '@/motions/delayChildren';

const PostGroups = ({ groupedPosts }: { groupedPosts: NotionPosts }) => {
  return (
    <motion.section
      whileInView="visible"
      initial="hidden"
      variants={listVariants}
      className="flex flex-col gap-8 w-[512px]"
    >
      {groupedPosts.map((post) => (
        <motion.div
          key={post.id}
          variants={itemVariants}
          whileHover={{
            scale: 1.01,
            transition: { duration: 0.2 },
          }}
        >
          <Link key={post.id} href={`/${post.id}`} className="flex flex-col gap-2">
            <motion.h2 className="text-2xl font-bold">{post.title}</motion.h2>
            <motion.p className="line-clamp-1 text-s text-gray-200">{post.summary}</motion.p>
            <motion.time className="text-sm text-gray-400">
              {format(post.date.start_date, 'MM.dd')}
            </motion.time>
          </Link>
        </motion.div>
      ))}
    </motion.section>
  );
};

export default PostGroups;
