import React from 'react';

import { getAllPosts } from '@/apis/NotionService';
import PostYearDigit from '@/container/home/components/PostYearDigit';
import PostMonthDigit from '@/container/home/components/PostMonthDigit';
import * as motion from 'motion/react-client';
import PostSection from '@/container/home/components/PostSection';
import PostFadeBlur from '@/container/home/components/PostFadeBlur';
import PostSearch from '@/container/home/components/PostSearch';

interface HomePageProps {
  locale: string;
}

const HomePage = async ({ locale: _locale }: HomePageProps) => {
  const posts = await getAllPosts({ includePages: false });
  return (
    <div className="flex h-dvh w-[100vw] flex-col items-center justify-center gap-8">
      <div className="fixed top-0 right-0 z-20 flex h-[70px] items-center justify-center px-5">
        <PostSearch posts={posts} />
      </div>

      <PostFadeBlur>
        <div className="tablet:gap-6 flex h-dvh flex-row items-center justify-center gap-1 overflow-hidden px-5">
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
            <div className="pointer-events-none absolute top-0 right-0 bottom-0 left-0 z-10 flex items-center justify-center select-none">
              <div className="border-brand-300 flex h-[120px] w-full border-y-[1px] border-solid select-none" />
            </div>
            <motion.div className="scrollbar-hide snap-y overflow-y-scroll">
              <PostSection posts={posts} />
            </motion.div>
          </div>
        </div>
      </PostFadeBlur>
    </div>
  );
};

export default HomePage;
