'use client';

import { useRouter } from 'next/navigation';
import PostThumbnail from './PostThumbnail';
import ClientPortal from './PortalClient';
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence } from 'motion/react';

interface ThumbnailTransitionProps {
  title: string;
  date: string;
  useTransition?: boolean;
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function ThumbnailTransition({
  title,
  date,
  useTransition = true,
  href,
  children,
  className,
}: ThumbnailTransitionProps) {
  const [showThumbnail, setShowThumbnail] = useState(false);
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleClose = useCallback(() => {
    router.push(href);
    setTimeout(() => {
      setShowThumbnail(false);
    }, 300);
  }, [href, router]);

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

  const handleClick = () => {
    if (useTransition) {
      setShowThumbnail(true);
    } else {
      router.push(href);
    }
  };

  return (
    <>
      <div onClick={handleClick} className={className}>
        {children}
      </div>
      <ClientPortal>
        <AnimatePresence>
          {showThumbnail && <PostThumbnail date={date} title={title} onClose={handleClose} />}
        </AnimatePresence>
      </ClientPortal>
    </>
  );
}
