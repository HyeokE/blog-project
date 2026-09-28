'use client';

import { ANALYTICS_ACTIONS } from '@/constants/analytics';
import { trackInteraction } from '@/utils/analytics';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUpRight, Search, X } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { NotionPosts } from '@/models/NotionPosts';
import { motionTokens, springs } from './motion-tokens';
import './wall-search.css';

type WallSearchProps = {
  open: boolean;
  query: string;
  posts: NotionPosts;
  onQueryChange: (query: string) => void;
  onClose: () => void;
  onAfterClose: () => void;
};

export default function WallSearch({
  open,
  query,
  posts,
  onQueryChange,
  onClose,
  onAfterClose,
}: WallSearchProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLOListElement>(null);
  const resultsScrollRef = useRef<HTMLDivElement>(null);
  const previousOverflowRef = useRef<string | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion ? { duration: 0 } : springs.gentle;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) {
      return;
    }
    if (!dialog.open) {
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      dialog.showModal();
    }
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    resultsScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      dialog?.close();
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
        previousOverflowRef.current = null;
      }
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus({ preventScroll: true });
      }
    };
  }, []);

  const finishClose = () => {
    if (!open) {
      dialogRef.current?.close();
      if (previousOverflowRef.current !== null) {
        document.body.style.overflow = previousOverflowRef.current;
        previousOverflowRef.current = null;
      }
      onAfterClose();
    }
  };

  return (
    <dialog
      data-analytics-label="search_close_backdrop"
      data-analytics-click-self="true"
      ref={dialogRef}
      className="wall-search-dialog"
      data-open={open}
      aria-labelledby="wall-search-heading"
      onCancel={(event) => {
        event.preventDefault();
        trackInteraction(ANALYTICS_ACTIONS.SEARCH_CLOSE, { method: 'keyboard' });
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <AnimatePresence onExitComplete={finishClose}>
        {open && (
          <motion.section
            key="search"
            className="wall-search-sheet"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : motionTokens.scale.subtle }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              scale: reduceMotion ? 1 : 0.99,
              transition: { duration: reduceMotion ? 0 : motionTokens.duration.fast },
            }}
            transition={transition}
          >
            <div className="wall-search-heading-row">
              <div>
                <p className="wall-search-eyebrow">HYEOK.</p>
                <h2 id="wall-search-heading">SEARCH</h2>
              </div>
              <motion.button
                type="button"
                className="wall-search-dismiss"
                aria-label="검색 닫기"
                onClick={onClose}
                whileHover={reduceMotion ? undefined : { rotate: 90 }}
                whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                transition={springs.snappy}
              >
                <X size={20} strokeWidth={1.2} />
              </motion.button>
            </div>

            <form
              className="wall-search-form"
              role="search"
              onSubmit={(event) => event.preventDefault()}
            >
              <div className="wall-search-field">
                <Search size={21} strokeWidth={1.3} aria-hidden="true" />
                <input
                  data-analytics-label="post_search"
                  ref={inputRef}
                  type="search"
                  aria-label="제목, 내용, 태그 검색"
                  aria-controls="wall-search-results"
                  aria-describedby="wall-search-count"
                  placeholder="제목, 내용, 태그로 검색"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(event) => onQueryChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      if (posts.length) {
                        trackInteraction(ANALYTICS_ACTIONS.SEARCH_RESULTS_FOCUS, { method: 'keyboard' });
                      }
                      resultsRef.current?.querySelector<HTMLAnchorElement>('a')?.focus();
                    }
                  }}
                />
                <AnimatePresence initial={false}>
                  {query && (
                    <motion.button
                      type="button"
                      className="wall-search-clear"
                      aria-label="검색어 지우기"
                      initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.8 }}
                      transition={reduceMotion ? { duration: 0 } : springs.snappy}
                      whileTap={reduceMotion ? undefined : { scale: 0.9 }}
                      onClick={() => {
                        onQueryChange('');
                        inputRef.current?.focus();
                      }}
                    >
                      <X size={15} strokeWidth={1.5} />
                    </motion.button>
                  )}
                </AnimatePresence>
                <span className="wall-search-focus-rule" aria-hidden="true" />
              </div>
            </form>

            <div className="wall-search-status">
              <p id="wall-search-count" role="status" aria-live="polite" aria-atomic="true">
                {query ? '검색 결과' : '전체 기록'} <strong>{posts.length}</strong>
              </p>
              <span>제목 · 내용 · 태그</span>
            </div>

            <div
              ref={resultsScrollRef}
              data-analytics-scroll="search_results"
              className="wall-search-results-scroll"
            >
              {posts.length ? (
                <ol id="wall-search-results" ref={resultsRef} className="wall-search-results">
                  {posts.map((post, index) => (
                    <motion.li
                      key={post.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{
                        duration: reduceMotion ? 0 : motionTokens.duration.fast,
                        delay: reduceMotion ? 0 : Math.min(index * 0.025, 0.125),
                      }}
                    >
                      <Link href={`/${post.id}`} onClick={onClose}>
                        <span className="wall-search-result-meta">
                          <time dateTime={post.date?.start_date}>
                            {post.date?.start_date?.split('T')[0].replaceAll('-', '.')}
                          </time>
                          {post.tags?.[0] && <span>{post.tags[0]}</span>}
                        </span>
                        <span className="wall-search-result-title">
                          {post.title}
                          <ArrowUpRight size={17} strokeWidth={1.25} aria-hidden="true" />
                        </span>
                        {post.summary && (
                          <span className="wall-search-result-summary">{post.summary}</span>
                        )}
                      </Link>
                    </motion.li>
                  ))}
                </ol>
              ) : (
                <div className="wall-search-no-results" id="wall-search-results">
                  <p>아직 일치하는 기록이 없어요.</p>
                  <span>조금 더 짧은 단어나 다른 태그로 찾아보세요.</span>
                </div>
              )}
            </div>
            <div className="wall-search-footnote" aria-hidden="true">
              <span>
                <ArrowDown size={11} /> 결과 탐색
              </span>
              <span>
                <kbd>ESC</kbd> 닫기
              </span>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </dialog>
  );
}
