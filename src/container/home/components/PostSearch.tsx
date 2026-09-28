'use client';
import { ANALYTICS_ACTIONS, ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import { trackInteraction } from '@/utils/analytics';
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
        trackInteraction(open ? ANALYTICS_ACTIONS.SEARCH_CLOSE : ANALYTICS_ACTIONS.SEARCH_OPEN, {
          section: ANALYTICS_SECTIONS.HEADER,
          method: 'keyboard',
        });
        setOpen(!open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open]);

  return (
    <>
      <div
        data-analytics-label={ANALYTICS_ELEMENTS.SEARCH_OPEN}
        data-analytics-section={ANALYTICS_SECTIONS.HEADER}
        className="flex cursor-pointer items-center gap-1"
        onClick={() => {
          setOpen(true);
        }}
      >
        <SearchIcon />
        <span className="flex gap-1 text-sm text-muted-foreground">
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 md:inline">
            Ctrl
          </kbd>
          <kbd className="hidden rounded bg-muted px-1.5 py-0.5 md:inline">
            K
          </kbd>
        </span>
      </div>
      <CommandMenu setOpen={setOpen} open={open} initialPosts={posts} />
    </>
  );
};

export default PostSearch;
