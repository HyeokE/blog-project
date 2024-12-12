import React from 'react';
import * as motion from 'motion/react-client';
import PostSection from '@/container/home/components/PostSection';
import { getAllPosts } from '@/apis/NotionService';
import PostYearDigit from '@/container/home/components/PostYearDigit';

const HomePage = async () => {
  const posts = await getAllPosts({ includePages: false });

  return (
    <div
      className="absolute inset-0 overflow-y-scroll
         snap-y snap-mandatory scroll-smooth
          [mask-image:linear-gradient(to_bottom,transparent,black_45%,black_65%,transparent)]"
    >
      <div className="flex flex-row gap-16 h-dvh items-center justify-center">
        <div className="relative h-dvh flex items-center justify-center ">
          <PostYearDigit />
        </div>
        <motion.div className="flex flex-col gap-8 h-dvh overflow-y-scroll snap-y">
          <PostSection posts={posts} />
        </motion.div>
      </div>
      <div className="absolute z-10 top-0 left-0 w-dvw h-dvh flex items-center justify-center select-none pointer-events-none">
        <div className="flex w-full h-[100px] border-y-[1px] border-solid border-gray-300 select-none" />
      </div>
    </div>
  );
};

export default HomePage;
