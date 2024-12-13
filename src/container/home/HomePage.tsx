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
      <div className="flex flex-row h-[100vh] overflow-hidden items-center justify-center">
        <div className="relative h-dvh flex items-center justify-center px-3 ">
          <PostYearDigit />
        </div>
        <div className="h-[41px] flex items-end ">
          <div className="w-[8px] h-[8px] rounded-[5px] bg-[#3a7bd5]" />
        </div>
        <div className="relative h-dvh flex items-center justify-center px-3 ">
          <PostMonthDigit />
        </div>
        <div className="h-[41px] flex items-end ">
          <div className="w-[8px] h-[8px] rounded-[5px] bg-[#3a7bd5]" />
        </div>
        <motion.div className="flex flex-col gap-8 h-dvh max-w-[612px] overflow-y-scroll snap-y scrollbar-hide">
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
