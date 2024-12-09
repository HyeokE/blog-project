import React, { use } from 'react';
import PostSection from '@/container/home/components/PostSection';
import { getAllPosts } from '@/apis/NotionService';
import { groupBy } from '@/utils/groupBy';
import { getYear } from 'date-fns';
import * as motion from 'motion/react-client';
import { listVariants } from '@/motions/delayChildren';

const HomePage = () => {
  const posts = use(getAllPosts({ includePages: false }));
  const groupedPosts = groupBy(posts, (post) => getYear(post.date.start_date));
  const years = Object.keys(groupedPosts)
    .sort((a, b) => Number(b) - Number(a))
    .map(Number);
  return (
    <motion.div
      variants={listVariants}
      className="max-w-[600px] flex flex-col w-fit gap-8 mx-auto py-[100px]"
    >
      {years.map((year) => (
        <PostSection key={year} posts={groupedPosts[year]} year={year} />
      ))}
    </motion.div>
  );
};

export default HomePage;
