'use client';
import React from 'react';
import type { NotionPosts } from '@/models/NotionPosts';
import { motion } from 'motion/react';
import { listVariants } from '@/motions/delayChildren';
import PostCard from '@/container/home/components/PostCard';

interface PostSectionProps {
  posts: NotionPosts;
}

const PostSection = ({ posts }: PostSectionProps) => {
  return (
    <motion.div
      variants={listVariants}
      className="mx-auto flex h-fit w-full flex-col gap-8 px-5 py-[calc(50dvh-41px)]"
    >
      {posts.map((post) => (
        <PostCard post={post} key={post.id} />
      ))}
    </motion.div>
  );
};

export default PostSection;
