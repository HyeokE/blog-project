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
    <div className="flex h-dvh w-dvw flex-col items-center justify-center gap-8">
      <div className="fixed right-0 top-0 flex h-[70px] items-center justify-center px-5">
        <PostSearch />
      </div>

      <PostFadeBlur>
        <div className="tablet:gap-6 flex h-[100vh] flex-row items-center justify-center gap-1 overflow-hidden">
          <div className="tablet:gap-4 flex flex-row gap-1">
            <div className="relative flex h-dvh min-w-[60px] items-center justify-center">
              <PostYearDigit />
            </div>
            <div className="relative flex h-dvh items-center justify-center">
              <PostMonthDigit />
            </div>
          </div>
          <div className="relative flex h-dvh max-w-[612px] flex-col gap-8">
            {/* Post Point Border  */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 top-0 z-10 flex select-none items-center justify-center">
              <div className="flex h-[120px] w-full select-none border-y-[1px] border-solid border-gray-300" />
            </div>
            <motion.div className="snap-y overflow-y-scroll scrollbar-hide">
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
