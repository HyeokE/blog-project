'use client';

import { ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import { useRouter } from 'next/navigation';
import ThemedLink from './ThemedLink';
import { useDesignTheme } from '@/context/DesignThemeContext';
import { getThemedHref } from '@/container/designs/theme';
import PostThumbnail from './PostThumbnail';
import ClientPortal from './PortalClient';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';

interface ThumbnailTransitionProps {
  title: string;
  date: string;
  useTransition?: boolean;
  href: string;
  postId?: string;
  children: React.ReactNode;
  className?: string;
}

export default function ThumbnailTransition({
  title,
  date,
  useTransition = false,
  href,
  postId,
  children,
  className,
}: ThumbnailTransitionProps) {
  const [showThumbnail, setShowThumbnail] = useState(false);
  const router = useRouter();
  const { theme } = useDesignTheme();
  const targetHref = getThemedHref(href, theme);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleClose = useCallback(() => {
    router.push(targetHref);
    setTimeout(() => {
      setShowThumbnail(false);
    }, 300);
  }, [targetHref, router]);

  useEffect(() => {
    if (showThumbnail) {
      timeoutRef.current = setTimeout(() => {
        handleClose();
      }, 1000);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [showThumbnail, handleClose]);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      useTransition &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      setShowThumbnail(true);
    }
  };

  return (
    <>
      <ThemedLink
        data-analytics-label={ANALYTICS_ELEMENTS.POST_OPEN}
        data-analytics-section={ANALYTICS_SECTIONS.POST_LIST}
        data-analytics-id={postId ?? href.split(/[?#]/)[0]}
        href={href}
        onClick={handleClick}
        className={className}
      >
        {children}
      </ThemedLink>
      <ClientPortal>
        <AnimatePresence>
          {showThumbnail && <PostThumbnail date={date} title={title} onClose={handleClose} />}
        </AnimatePresence>
      </ClientPortal>
    </>
  );
}
