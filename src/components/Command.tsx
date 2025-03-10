'use client';
import type { NotionPost } from '@/models/NotionPosts';
import { fadeVariants } from '@/motions/delayChildren';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { format } from 'date-fns';
import { AnimatePresence } from 'framer-motion';
import * as motion from 'motion/react-client';
import { useState } from 'react';

type CommandMenuProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialPosts: NotionPost[];
};

const CommandMenu = ({ open, setOpen, initialPosts }: CommandMenuProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          className="fixed top-0 left-0 flex h-dvh w-dvw items-center justify-center"
        >
          <DialogTitle hidden={true}>Search</DialogTitle>
          <DialogDescription hidden={true}>
            Global command menu for searching posts
          </DialogDescription>
          <motion.div
            className="bg-opacity-50 dark:bg-opacity-50 fixed top-0 left-0 h-full w-full bg-neutral-400 dark:bg-neutral-100"
            onClick={() => {
              setOpen(false);
            }}
            {...fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
          <motion.div
            className="z-10 h-[600px] w-full max-w-md overflow-hidden rounded-lg border border-gray-300 bg-white text-black shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            {...fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Input Bar */}
            <Command.Input
              className="w-full bg-transparent p-4 text-base outline-hidden placeholder:text-gray-400 dark:placeholder:text-neutral-500"
              placeholder="포스트 검색..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />

            {/* List Area */}
            <Command.List className="h-full overflow-auto">
              {/* Empty state */}
              <Command.Empty className="p-4 text-sm text-gray-500 dark:text-neutral-500">
                검색 결과가 없습니다.
              </Command.Empty>

              {initialPosts.map((post) => (
                <Command.Item
                  key={post.id}
                  className="flex cursor-pointer flex-col gap-1 rounded-md px-3 py-2 transition-colors duration-100 data-[selected=true]:bg-gray-100 data-[selected=true]:text-white dark:data-[selected=true]:bg-neutral-800 dark:data-[selected=true]:text-white"
                  onSelect={() => {
                    window.location.href = `/${post.id}`;
                    setOpen(false);
                  }}
                >
                  <span className="text-xs text-gray-600 dark:text-neutral-500">
                    {post.date?.start_date
                      ? format(new Date(post.date.start_date), 'yyyy.MM.dd')
                      : '날짜 없음'}
                  </span>
                  <span className="font-semibold text-black dark:text-neutral-100">
                    {post.title}
                  </span>
                  {post.summary && (
                    <span className="line-clamp-2 text-sm text-gray-700 dark:text-neutral-400">
                      {post.summary}
                    </span>
                  )}
                </Command.Item>
              ))}
            </Command.List>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
};

export default CommandMenu;
