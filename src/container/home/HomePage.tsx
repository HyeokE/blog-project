import React from 'react';

import { getAllPosts } from '@/apis/NotionService';
import HomeLayout from '@/container/home/components/HomeLayout';

const HomePage = async () => {
  const posts = await getAllPosts({ includePages: false });

  // Personal 태그가 없는 포스트만 표시 (기본값)
  const filteredPosts = posts.filter(
    (post) => !post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
  );

  return <HomeLayout posts={filteredPosts} />;
};

export default HomePage;
