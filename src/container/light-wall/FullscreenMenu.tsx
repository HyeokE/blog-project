'use client';

import { ANALYTICS_ACTIONS } from '@/constants/analytics';
import { trackInteraction } from '@/utils/analytics';
import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, X } from 'lucide-react';
import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import { motionTokens, springs } from './motion-tokens';

const destinations = [
  { label: 'LOGS', href: '/' },
  { label: 'RESUME', href: '/about' },
  { label: 'GALLERY', href: '/gallery' },
];

export default function FullscreenMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const present = useIsPresent();
  const reduceMotion = useReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const transition = reduceMotion ? { duration: motionTokens.duration.instant } : springs.gentle;
  const item = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
    visible: { opacity: 1, y: 0, transition },
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      id="wall-index-panel"
      className="wall-menu-dialog"
      aria-label="메인 메뉴"
      onCancel={(event) => {
        event.preventDefault();
        trackInteraction(ANALYTICS_ACTIONS.MENU_CLOSE, { method: 'keyboard' });
        onClose();
      }}
    >
      <motion.div
        className="wall-index-panel"
        initial="hidden"
        animate="visible"
        exit="closed"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: reduceMotion ? 0.08 : 0.3 } },
          closed: { opacity: 0, transition: { duration: reduceMotion ? 0.08 : 0.2 } },
        }}
        style={{ pointerEvents: present ? 'auto' : 'none' }}
      >
        <div className="wall-menu-top">
          <span className="wall-wordmark">
            HYEOK<span>.</span>
          </span>
          <motion.button
            ref={closeRef}
            type="button"
            className="wall-menu-close"
            aria-label="메뉴 닫기"
            onClick={onClose}
            whileTap={reduceMotion ? undefined : { scale: motionTokens.scale.press }}
            transition={springs.snappy}
          >
            <span>CLOSE</span>
            <X size={22} strokeWidth={1.2} aria-hidden="true" />
          </motion.button>
        </div>
        <nav className="wall-menu-content" aria-label="메인 탐색">
          <motion.ol
            variants={{
              visible: { transition: { staggerChildren: reduceMotion ? 0 : motionTokens.stagger } },
            }}
          >
            {destinations.map(({ label, href }, index) => (
              <motion.li key={href} variants={item}>
                <Link
                  href={href}
                  aria-current={
                    pathname === href || (href === '/' && pathname === '/2025/light')
                      ? 'page'
                      : undefined
                  }
                  onClick={onClose}
                  tabIndex={present ? 0 : -1}
                >
                  <span className="wall-index-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span className="wall-index-label">{label}</span>
                  <ArrowUpRight strokeWidth={1} aria-hidden="true" />
                </Link>
              </motion.li>
            ))}
          </motion.ol>
          <motion.div className="wall-menu-bottom" variants={item}>
            <Link href="/personal" onClick={onClose} tabIndex={present ? 0 : -1}>
              개인 기록
            </Link>
            <Link href="/designs" onClick={onClose} tabIndex={present ? 0 : -1}>
              테마 변경 <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </motion.div>
        </nav>
        <span className="wall-menu-copyright">© {new Date().getFullYear()} HYEOK.</span>
      </motion.div>
    </dialog>
  );
}
