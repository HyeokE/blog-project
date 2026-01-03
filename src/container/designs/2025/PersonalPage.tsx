import React from 'react';
import { getAllPosts } from '@/apis/NotionService';
import HomeLayout from '@/container/home/components/HomeLayout';

const PersonalPage2025 = async () => {
  const posts = await getAllPosts({ includePages: false });
  const personalPosts = posts.filter((post) =>
    post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
  );

  return <HomeLayout posts={personalPosts} />;
};

export default PersonalPage2025;


