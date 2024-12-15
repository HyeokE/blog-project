import React from 'react';

import { NavDock } from '@/components/NavDock';
import { getAllPosts } from '@/apis/NotionService';
import PostYearDigit from '@/container/home/components/PostYearDigit';
import PostMonthDigit from '@/container/home/components/PostMonthDigit';
import * as motion from 'motion/react-client';
import PostSection from '@/container/home/components/PostSection';
import PostFadeBlur from '@/container/home/components/PostFadeBlur';
import PostSearch from '@/container/home/components/PostSearch';

const HomePage = async () => {
  const posts = await getAllPosts({ includePages: false });
  return (
    <div className="flex flex-col w-dvw gap-8 items-center justify-center h-dvh">
      <div className="fixed right-0 top-0 flex items-center justify-center h-[70px] px-5">
        <PostSearch />
      </div>

      <PostFadeBlur>
        <div className="flex flex-row h-[100vh] overflow-hidden items-center justify-center gap-6">
          <div className="flex flex-row gap-4">
            <div className="relative h-dvh flex items-center justify-center min-w-[60px]">
              <PostYearDigit />
            </div>
            <div className="relative h-dvh flex items-center justify-center ">
              <PostMonthDigit />
            </div>
          </div>
          <div className="relative flex flex-col gap-8 h-dvh max-w-[612px] ">
            {/* Post Point Border  */}
            <div className="absolute z-10 top-0 left-0 right-0 bottom-0 flex items-center justify-center select-none pointer-events-none">
              <div className="flex w-full h-[120px] border-y-[1px] border-solid border-gray-300 select-none" />
            </div>
            <motion.div className="overflow-y-scroll snap-y scrollbar-hide">
              <PostSection posts={posts} />
            </motion.div>
          </div>
        </div>
      </PostFadeBlur>

      <NavDock />
    </div>
  );
};

export default HomePage;
