'use client';

import { ANALYTICS_ACTIONS, ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import { trackInteraction } from '@/utils/analytics';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUp, ArrowUpRight, Moon, Search, Sun } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { NotionPosts } from '@/models/NotionPosts';
import { useDarkMode } from '@/context/DarkModeContext';
import ProjectedWindowFallback from './ProjectedWindowFallback';
import RollingNumber from './RollingNumber';
import WallMenu from './WallMenu';
const loadSearch = () => import('./WallSearch');
const WallSearch = dynamic(loadSearch, { ssr: false });
import useCircularPosts from './useCircularPosts';
import './light-wall.css';

export default function LightWall({ posts }: { posts: NotionPosts }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userScrollingRef = useRef(false);
  const { mode: savedMode, toggleMode } = useDarkMode();
  const mode = savedMode === 'dark' ? 'dark' : 'light';
  const [searchMounted, setSearchMounted] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();
  const latestPostId = useMemo(
    () =>
      posts.reduce<(typeof posts)[number] | undefined>(
        (latest, post) =>
          !latest || (post.date?.start_date ?? '') > (latest.date?.start_date ?? '')
            ? post
            : latest,
        undefined,
      )?.id,
    [posts],
  );
  const filtered = useMemo(
    () =>
      posts.filter((post) =>
        `${post.title} ${post.summary ?? ''} ${post.tags?.join(' ') ?? ''}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [posts, query],
  );
  const list = useCircularPosts({
    count: filtered.length,
    resetKey: query,
    rootRef,
    scrollRef,
    reduceMotion,
  });
  const { active } = list;
  const selected = filtered[active] ?? filtered[0];
  const selectedPostId = selected?.id;

  useEffect(() => {
    if (!userScrollingRef.current || !selectedPostId) {
      return;
    }
    const timer = window.setTimeout(() => {
      if (!userScrollingRef.current) {
        return;
      }
      trackInteraction(ANALYTICS_ACTIONS.POST_NAVIGATE, {
        method: 'scroll',
        section: ANALYTICS_SECTIONS.POST_LIST,
        content_id: selectedPostId,
      });
      userScrollingRef.current = false;
    }, 250);
    return () => window.clearTimeout(timer);
  }, [selectedPostId]);

  const date = selected?.date?.start_date?.split('-') ?? [];

  const closeSearch = () => {
    setSearching(false);
  };

  return (
    <div
      ref={rootRef}
      className="light-wall"
      data-wall-mode={mode}
      data-renderer="svg"
    >
      <ProjectedWindowFallback mode={mode} />
      <div className="wall-light-source" aria-hidden="true" />
      <header className="wall-header">
        <Link
          data-analytics-label={ANALYTICS_ELEMENTS.HOME_LINK}
          data-analytics-section={ANALYTICS_SECTIONS.HEADER}
          data-analytics-id={'home'}
          href="/"
          className="wall-wordmark"
          aria-label="HYEOK.DEV 홈"
        >
          HYEOK<span>.</span>
        </Link>
        <div className="wall-header-actions">
          <button
            data-analytics-label={ANALYTICS_ELEMENTS.SEARCH_OPEN}
            data-analytics-section={ANALYTICS_SECTIONS.HEADER}
            ref={searchButtonRef}
            type="button"
            aria-label="글 검색"
            aria-expanded={searching}
            aria-haspopup="dialog"
            onPointerEnter={() => {
              void loadSearch();
            }}
            onFocus={() => {
              void loadSearch();
            }}
            onClick={() => {
              if (searching) {
                closeSearch();
              } else {
                setSearchMounted(true);
                setSearching(true);
              }
            }}
          >
            <Search size={18} strokeWidth={1.5} />
          </button>
          <button
            data-analytics-label={ANALYTICS_ELEMENTS.COLOR_MODE_TOGGLE}
            data-analytics-section={ANALYTICS_SECTIONS.HEADER}
            type="button"
            aria-label={mode === 'light' ? '어두운 조명으로 전환' : '밝은 조명으로 전환'}
            onClick={toggleMode}
          >
            {mode === 'light' ? (
              <Moon size={18} strokeWidth={1.5} />
            ) : (
              <Sun size={18} strokeWidth={1.5} />
            )}
          </button>
        </div>
      </header>

      {searchMounted && (
        <WallSearch
          open={searching}
          query={query}
          posts={filtered}
          onQueryChange={(nextQuery) => {
            userScrollingRef.current = false;
            setQuery(nextQuery);
          }}
          onClose={closeSearch}
          onAfterClose={() => {
            setQuery('');
            searchButtonRef.current?.focus({ preventScroll: true });
          }}
        />
      )}

      <main className="wall-main" aria-label="블로그 글 목록">
        <h1 className="wall-sr-only">생각과 기록</h1>
        {selected && (
          <aside className="wall-calendar" aria-label={`${date[0]}년 ${Number(date[1])}월`}>
            <div className="wall-year-window" aria-hidden="true">
              <span className="wall-year">
                <RollingNumber value={Number(date[0]) || 0} pad={4} />
              </span>
            </div>
            <div className="wall-month-window" aria-hidden="true">
              <span className="wall-month">
                <RollingNumber value={Number(date[1]) || 0} />
                <span className="wall-month-label">월</span>
              </span>
            </div>
            <div className="wall-calendar-rule" aria-hidden="true" />
          </aside>
        )}

        <div
          ref={scrollRef}
          data-analytics-section={ANALYTICS_SECTIONS.POST_LIST}
          className="wall-scroll"
          tabIndex={0}
          aria-label="위아래로 스크롤하여 글 탐색"
          onWheel={() => {
            userScrollingRef.current = true;
          }}
          onTouchMove={() => {
            userScrollingRef.current = true;
          }}
          onKeyDown={(event) => {
            userScrollingRef.current = false;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              if (filtered.length > 1) {
                trackInteraction(ANALYTICS_ACTIONS.POST_NAVIGATE, {
                  method: 'keyboard',
                  section: ANALYTICS_SECTIONS.POST_LIST,
                  direction: event.key === 'ArrowDown' ? 'next' : 'previous',
                });
              }
              list.moveBy(event.key === 'ArrowDown' ? 1 : -1);
            }
            if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              event.currentTarget.focus({ preventScroll: true });
              if (filtered.length > 1) {
                trackInteraction(ANALYTICS_ACTIONS.POST_NAVIGATE, {
                  method: 'keyboard',
                  section: ANALYTICS_SECTIONS.POST_LIST,
                  destination: event.key === 'Home' ? 'first' : 'last',
                });
              }
              list.moveToIndex(event.key === 'Home' ? 0 : filtered.length - 1);
            }
          }}
        >
          <ol className="wall-posts">
            <li
              className="wall-virtual-spacer"
              aria-hidden="true"
              style={{ height: `calc(var(--row-height) * ${list.start})` }}
            />
            {list.slots.map((rowSlot) => {
              const index = list.indexForSlot(rowSlot);
              const post = filtered[index];
              const isActive = rowSlot === list.slot;
              return (
                <li
                  key={`${query}:${rowSlot}:${post.id}`}
                  ref={(element) => list.registerRow(rowSlot, element)}
                  data-wall-row
                  style={list.styleForSlot(rowSlot)}
                  data-slot={rowSlot}
                  data-active={isActive}
                  aria-posinset={index + 1}
                  aria-setsize={filtered.length}
                  className="wall-row"
                >
                  <Link
                    data-analytics-label={ANALYTICS_ELEMENTS.POST_OPEN}
                    data-analytics-section={ANALYTICS_SECTIONS.POST_LIST}
                    data-analytics-id={post.id}
                    href={`/${post.id}`}
                    className="wall-post"
                    tabIndex={isActive ? 0 : -1}
                    aria-current={isActive ? 'true' : undefined}
                    onFocus={() => list.moveToSlot(rowSlot)}
                  >
                    <div className="wall-post-meta">
                      <time dateTime={post.date?.start_date}>
                        {post.date?.start_date?.split('-')[2]}일
                      </time>
                      <span>{post.tags?.[0] ?? 'Writing'}</span>
                      {post.id === latestPostId && (
                        <span className="wall-latest-chip">Latest</span>
                      )}
                    </div>
                    <h2 className="wall-relief-text" data-long={post.title.length > 28}>
                      {post.title}
                    </h2>
                    <div className="wall-post-description">
                      <p>{post.summary}</p>
                      <ArrowUpRight size={19} strokeWidth={1.2} aria-hidden="true" />
                    </div>
                  </Link>
                </li>
              );
            })}
            <li
              className="wall-virtual-spacer"
              aria-hidden="true"
              style={{ height: `calc(var(--row-height) * ${list.totalSlots - list.end})` }}
            />
          </ol>
          {filtered.length === 0 && (
            <p className="wall-empty">
              {query ? '검색한 글이 없어요. 다른 단어로 찾아보세요.' : '아직 공개된 글이 없어요.'}
            </p>
          )}
        </div>
      </main>

      <footer className="wall-footer">
        <WallMenu />
        <div className="wall-pagination">
          <span className="wall-count" aria-live="polite" aria-atomic="true">
            <strong>
              <RollingNumber value={filtered.length ? active + 1 : 0} />
            </strong>
            <span>/</span>
            {String(filtered.length).padStart(2, '0')}
          </span>
          <button
            data-analytics-id={selected?.id}
            data-analytics-label={ANALYTICS_ELEMENTS.POST_PREVIOUS}
            data-analytics-section={ANALYTICS_SECTIONS.POST_LIST}
            type="button"
            aria-label="이전 글"
            disabled={filtered.length < 2}
            onClick={() => {
              userScrollingRef.current = false;
              list.moveBy(-1);
            }}
          >
            <ArrowUp size={16} />
          </button>
          <button
            data-analytics-id={selected?.id}
            data-analytics-label={ANALYTICS_ELEMENTS.POST_NEXT}
            data-analytics-section={ANALYTICS_SECTIONS.POST_LIST}
            type="button"
            aria-label="다음 글"
            disabled={filtered.length < 2}
            onClick={() => {
              userScrollingRef.current = false;
              list.moveBy(1);
            }}
          >
            <ArrowDown size={16} />
          </button>
        </div>
      </footer>
    </div>
  );
}
