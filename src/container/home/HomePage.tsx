import PostMonthDigit from '@/container/home/components/PostMonthDigit';
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
      [mask-image:linear-gradient(to_bottom,transparent_5%,black_45%,black_65%,transparent_95%)]"
    >
      <div className="flex flex-row h-[100vh] overflow-hidden items-center justify-center gap-6">
        <div className="flex flex-row gap-4">
          <div className="relative h-dvh flex items-center justify-center">
            <PostYearDigit />
          </div>
          <div className="relative h-dvh flex items-center justify-center ">
            <PostMonthDigit />
          </div>
        </div>
        <div className="relative flex flex-col gap-8 h-dvh max-w-[612px] ">
          <div className="absolute z-10 top-0 left-0 right-0 bottom-0 flex items-center justify-center select-none pointer-events-none">
            <div className="flex w-full h-[120px] border-y-[1px] border-solid border-gray-400 select-none" />
          </div>
          <motion.div className="overflow-y-scroll snap-y scrollbar-hide">
            <PostSection posts={posts} />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
