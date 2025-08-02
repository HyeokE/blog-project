import React from 'react';

import { getAllPosts } from '@/apis/NotionService';
import HomeLayout from '@/container/home/components/HomeLayout';

const PersonalPage = async () => {
  const posts = await getAllPosts({ includePages: false });

  // Personal 태그가 있는 포스트만 필터링
  const personalPosts = posts.filter((post) =>
    post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
  );

  return <HomeLayout posts={personalPosts} />;
};

export default PersonalPage;
