'use client';
import type { NotionPost } from '@/models/NotionPosts';
import { DialogDescription, DialogTitle } from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { format } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

type CommandMenuProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  initialPosts: NotionPost[];
};

// 애니메이션 변수 정의
const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } },
  exit: { opacity: 0, transition: { duration: 0.3, ease: 'easeIn' } },
};

const dialogVariants = {
  initial: { opacity: 0, scale: 0.96, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      mass: 1,
      when: 'beforeChildren',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: {
      duration: 0.25,
      ease: 'easeInOut',
    },
  },
};

const itemVariants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: 5,
    transition: { duration: 0.2, ease: 'easeIn' },
  },
};

const CommandMenu = ({ open, setOpen, initialPosts }: CommandMenuProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // 다이얼로그가 열릴 때 input에 자동 포커스
  useEffect(() => {
    if (open && inputRef) {
      setTimeout(() => {
        inputRef.focus();
      }, 100);
    }
  }, [open, inputRef]);

  // 닫기 핸들러 - 부드러운 종료를 위해 상태 관리
  const handleClose = () => {
    setIsClosing(true);
    // 애니메이션 시간을 고려하여 setTimeout 설정
    setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 300); // 애니메이션 종료 시간보다 살짝 길게 설정
  };

  // 아이템 선택 핸들러
  const handleItemSelect = (postId: string) => {
    setIsClosing(true);
    setTimeout(() => {
      window.location.href = `/${postId}`;
      setOpen(false);
      setIsClosing(false);
    }, 150);
  };

  return (
    <AnimatePresence mode="wait">
      {(open || isClosing) && (
        <Command.Dialog
          open={open}
          onOpenChange={(open) => {
            if (!open) {
              handleClose();
            } else {
              setOpen(true);
            }
          }}
          className="fixed top-0 left-0 flex h-dvh w-dvw items-center justify-center"
        >
          <DialogTitle hidden={true}>Search</DialogTitle>
          <DialogDescription hidden={true}>
            Global command menu for searching posts
          </DialogDescription>
          <motion.div
            className="fixed top-0 left-0 h-full w-full bg-neutral-900/30 backdrop-blur-sm backdrop-filter dark:bg-neutral-950/40"
            onClick={handleClose}
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
          <motion.div
            className="z-10 h-[600px] w-full max-w-md overflow-hidden rounded-lg border border-gray-200/60 bg-white/95 text-black shadow-xl backdrop-blur-md dark:border-neutral-800/60 dark:bg-neutral-900/90 dark:text-neutral-100"
            variants={dialogVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Input Bar */}
            <Command.Input
              ref={setInputRef}
              className="w-full bg-transparent p-4 text-base outline-hidden placeholder:text-gray-400 dark:placeholder:text-neutral-400"
              placeholder="포스트 검색..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />

            {/* List Area */}
            <Command.List className="h-full overflow-auto p-2">
              {/* Empty state */}
              <Command.Empty className="p-4 text-sm text-gray-500 dark:text-neutral-400">
                검색 결과가 없습니다.
              </Command.Empty>

              <motion.div
                variants={{
                  animate: {
                    transition: {
                      staggerChildren: 0.05, // 0.05초 간격으로 항목들이 순차적으로 나타남
                    },
                  },
                }}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <AnimatePresence>
                  {initialPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      variants={itemVariants}
                      transition={{ delay: index * 0.03 }}
                      layout
                    >
                      <Command.Item
                        className="flex cursor-pointer flex-col gap-1 rounded-md px-3 py-2 transition-all duration-150 data-[selected=true]:scale-[1.02] data-[selected=true]:bg-gray-100/80 data-[selected=true]:text-black dark:data-[selected=true]:bg-neutral-800/80 dark:data-[selected=true]:text-white"
                        onSelect={() => handleItemSelect(post.id)}
                      >
                        <span className="text-xs text-gray-600 dark:text-neutral-400">
                          {post.date?.start_date
                            ? format(new Date(post.date.start_date), 'yyyy.MM.dd')
                            : '날짜 없음'}
                        </span>
                        <span className="font-semibold text-black dark:text-neutral-100">
                          {post.title}
                        </span>
                        {post.summary && (
                          <span className="line-clamp-2 text-sm text-gray-700 dark:text-neutral-300">
                            {post.summary}
                          </span>
                        )}
                      </Command.Item>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </Command.List>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
};

export default CommandMenu;
