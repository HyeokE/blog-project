'use client';
import React from 'react';
import type { NotionPosts } from '@/models/NotionPosts';
import { motion } from 'framer-motion';
import { listVariants } from '@/motions/delayChildren';
import PostCard from '@/container/home/components/PostCard';

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
        <PostCard post={post} key={post.id} />
      ))}
    </motion.div>
  );
};

export default PostSection;
