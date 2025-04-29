'use client';
import React, { useEffect, useState } from 'react';
import { SearchIcon } from '@/assets/SearchIcon';
import CommandMenu from '@/components/Command';
import type { NotionPost } from '@/models/NotionPosts';

type PostSearchProps = {
  posts: NotionPost[];
};

const PostSearch = ({ posts = [] }: PostSearchProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <div
        className="flex cursor-pointer items-center gap-1"
        onClick={() => {
          setOpen(true);
        }}
      >
        <SearchIcon />
        <span className="flex gap-1 text-sm text-gray-600 dark:text-neutral-400">
          <kbd className="hidden rounded bg-gray-200 px-1.5 py-0.5 md:inline dark:bg-neutral-800">
            Ctrl
          </kbd>
          <kbd className="hidden rounded bg-gray-200 px-1.5 py-0.5 md:inline dark:bg-neutral-800">
            K
          </kbd>
        </span>
      </div>
      <CommandMenu setOpen={setOpen} open={open} initialPosts={posts} />
    </>
  );
};

export default PostSearch;
