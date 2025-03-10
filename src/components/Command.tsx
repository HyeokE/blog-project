'use client';
import { Command } from 'cmdk';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import * as motion from 'motion/react-client';
import { fadeVariants } from '@/motions/delayChildren';
import { AnimatePresence } from 'framer-motion';

type CommandMenuProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const CommandMenu = ({ open, setOpen }: CommandMenuProps) => {
  return (
    <AnimatePresence>
      {open && (
        <Command.Dialog
          open={open}
          onOpenChange={setOpen}
          className="fixed left-0 top-0 flex h-dvh w-dvw items-center justify-center"
        >
          <DialogTitle hidden={true}>Search</DialogTitle>
          <DialogDescription hidden={true}>
            Global command menu for searching posts
          </DialogDescription>
          <motion.div
            className="fixed left-0 top-0 h-full w-full bg-neutral-400 bg-opacity-50 dark:bg-neutral-100 dark:bg-opacity-50"
            onClick={() => {
              setOpen(false);
            }}
            {...fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
          <motion.div
            className="z-10 w-full max-w-md overflow-hidden rounded-lg border border-gray-300 bg-white text-black shadow-lg dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
            {...fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Input Bar */}
            <Command.Input
              className="w-full bg-transparent p-4 text-base outline-hidden placeholder:text-gray-400 dark:placeholder:text-neutral-500"
              placeholder="Search posts..."
            />

            {/* List Area */}
            <Command.List>
              {/* Empty state */}
              <Command.Empty className="p-4 text-sm text-gray-500 dark:text-neutral-500">
                No results found.
              </Command.Empty>

              {/* Example group for posts */}
              <Command.Group
                heading="Recent Posts"
                className="gap-2 px-2 py-2 text-sm tracking-wider text-gray-500 dark:text-neutral-500"
              >
                {/* Post Item */}
                <Command.Item className="flex cursor-pointer flex-col gap-1 rounded-md px-3 py-2 transition-colors duration-100 hover:bg-gray-100 dark:hover:bg-neutral-800">
                  <span className="text-xs text-gray-600 dark:text-neutral-500">08일</span>
                  <span className="font-semibold text-black dark:text-neutral-100">
                    useSelect 함수 제작기 (feat: 함수 오버로딩)
                  </span>
                  <span className="text-sm text-gray-700 dark:text-neutral-400">
                    함수 오버로딩을 활용한 useSelect 함수 제작기
                  </span>
                </Command.Item>

                {/* Another Post Item */}
                <Command.Item className="flex cursor-pointer flex-col gap-1 rounded-md px-3 py-2 transition-colors duration-100 hover:bg-gray-100 dark:hover:bg-neutral-800">
                  <span className="text-xs text-gray-600 dark:text-neutral-500">05일</span>
                  <span className="font-semibold text-black dark:text-neutral-100">
                    React Suspense Overview
                  </span>
                  <span className="text-sm text-gray-700 dark:text-neutral-400">
                    A deep dive into concurrent features and data fetching
                  </span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
};

export default CommandMenu;
