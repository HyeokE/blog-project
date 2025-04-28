'use client';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { useTranslation } from '@/hooks/useTranslation';
import Link from 'next/link';
import type { NotionPost } from '@/models/NotionPosts';
import { defaultLocale } from '@/i18n';

// 스타일 정의
const Command = {
  Dialog: ({ children, ...props }: { children: React.ReactNode }) => {
    return (
      <Dialog {...props}>
        <div className="fixed inset-0 z-50">
          <div className="fixed inset-0 bg-black/10 backdrop-blur-sm dark:bg-black/50" />
          <div className="fixed inset-x-0 top-[20%] mx-auto max-w-md">{children}</div>
        </div>
      </Dialog>
    );
  },
  Input: ({
    value,
    onValueChange,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
  }) => {
    const { t } = useTranslation();
    return (
      <div className="flex items-center border-b border-gray-200 px-3 dark:border-neutral-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mr-2 h-4 w-4 shrink-0 text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <CommandPrimitive.Input
          value={value}
          onValueChange={onValueChange}
          className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-neutral-500"
          placeholder={t('search.placeholder') || '포스트 검색...'}
        />
      </div>
    );
  },
  List: ({ children }: { children: React.ReactNode }) => {
    return (
      <CommandPrimitive.List className="max-h-[300px] overflow-y-auto p-2">
        {children}
      </CommandPrimitive.List>
    );
  },
  Empty: () => {
    const { t } = useTranslation();
    return (
      <div className="py-6 text-center text-sm text-neutral-500">
        {t('search.no_results') || '검색 결과가 없습니다.'}
      </div>
    );
  },
  Group: ({ heading, children }: { heading: string; children: React.ReactNode }) => {
    return (
      <CommandPrimitive.Group
        className="overflow-hidden px-1 py-2 text-neutral-500"
        heading={heading}
      >
        {children}
      </CommandPrimitive.Group>
    );
  },
  Item: ({
    children,
    value,
    onSelect,
    href,
  }: {
    children: React.ReactNode;
    value?: string;
    onSelect?: (value: string) => void;
    href?: string;
  }) => {
    const { locale } = useTranslation();

    // href가 있는 경우에만 Link 컴포넌트 사용, 없으면 div 사용
    if (href) {
      // 경로 처리: 한국어는 그대로, 영어는 /en 접두사
      let path = href;
      if (locale !== defaultLocale) {
        path = `/${locale}${href}`;
      }

      return (
        <CommandPrimitive.Item
          value={value}
          onSelect={onSelect}
          className="relative flex cursor-pointer items-center rounded-md px-2 py-1 text-sm text-neutral-700 select-none hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          <Link href={path}>{children}</Link>
        </CommandPrimitive.Item>
      );
    }

    // href가 없는 경우
    return (
      <CommandPrimitive.Item
        value={value}
        onSelect={onSelect}
        className="relative flex cursor-pointer items-center rounded-md px-2 py-1 text-sm text-neutral-700 select-none hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
      >
        <div>{children}</div>
      </CommandPrimitive.Item>
    );
  },
};

// 검색 컴포넌트
function CommandMenu({
  setOpen,
  open,
  initialPosts,
}: {
  setOpen: (open: boolean) => void;
  open: boolean;
  initialPosts: NotionPost[];
}) {
  const [query, setQuery] = useState('');
  const [posts, setPosts] = useState<NotionPost[]>(initialPosts);
  const { t } = useTranslation();

  // 검색어에 따라 포스트 필터링
  const searchPosts = useCallback(
    (search: string) => {
      if (!search) {
        setPosts(initialPosts);
        return;
      }

      const filtered = initialPosts.filter((post) =>
        post.title?.toLowerCase().includes(search.toLowerCase()),
      );
      setPosts(filtered);
    },
    [initialPosts],
  );

  // 검색어 변경 시 필터링
  useEffect(() => {
    searchPosts(query);
  }, [query, searchPosts]);

  return (
    <CommandPrimitive.Dialog
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-md border border-neutral-200 bg-white shadow-md dark:border-neutral-800 dark:bg-neutral-900"
    >
      <Command.Dialog>
        <CommandPrimitive className="flex h-full w-full flex-col overflow-hidden rounded-md bg-white dark:bg-neutral-900">
          <Command.Input value={query} onValueChange={setQuery} />
          <Command.List>
            {posts.length > 0 ? (
              <>
                {posts.map((post: NotionPost) => (
                  <Command.Item key={post.id} value={post.title} href={`/${post.id}`}>
                    <div className="flex flex-col gap-1">
                      <span className="text-md font-bold">{post.title}</span>
                      <span className="text-sm opacity-80">{post.createdTime}</span>
                    </div>
                  </Command.Item>
                ))}
              </>
            ) : (
              <Command.Empty />
            )}
          </Command.List>
        </CommandPrimitive>
      </Command.Dialog>
    </CommandPrimitive.Dialog>
  );
}

export default CommandMenu;
