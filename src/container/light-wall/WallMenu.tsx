'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { motionTokens, springs } from './motion-tokens';

const loadMenu = () => import('./FullscreenMenu');
const FullscreenMenu = dynamic(loadMenu, { ssr: false });

export default function WallMenu() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  return (
    <div className="wall-index" data-open={open}>
      <motion.button
        ref={buttonRef}
        type="button"
        className="wall-index-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerEnter={() => {
          void loadMenu();
        }}
        onFocus={() => {
          void loadMenu();
        }}
        aria-controls="wall-index-panel"
        onClick={() => setOpen(true)}
        whileTap={reduceMotion ? undefined : { scale: motionTokens.scale.press }}
        transition={springs.snappy}
      >
        <span className="wall-index-symbol">
          <Plus size={16} strokeWidth={1.2} aria-hidden="true" />
        </span>
        <span>MENU</span>
      </motion.button>
      <AnimatePresence>
        {open && <FullscreenMenu key="menu" onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </div>
  );
}
