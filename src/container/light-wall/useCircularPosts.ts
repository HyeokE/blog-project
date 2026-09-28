'use client';

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { flushSync } from 'react-dom';

const SLOT_COUNT = 10_001;
const ORIGIN = Math.floor(SLOT_COUNT / 2);
const modulo = (value: number, length: number) => ((value % length) + length) % length;

export default function useCircularPosts({
  count,
  resetKey,
  rootRef,
  scrollRef,
  reduceMotion,
}: {
  count: number;
  resetKey: string;
  rootRef: RefObject<HTMLDivElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
  reduceMotion: boolean | null;
}) {
  // The server cannot set scrollTop. Start with the actual first row in view,
  // then enable the long circular runway synchronously during hydration.
  const [loopReady, setLoopReady] = useState(false);
  const circular = loopReady && count > 1;
  const origin = circular ? ORIGIN : 0;
  const totalSlots = circular ? SLOT_COUNT : count;
  const slotRef = useRef(origin);
  const rowHeightRef = useRef(176);
  const rowsRef = useRef(new Map<number, HTMLLIElement>());
  const frameRef = useRef(0);
  const resizeFrameRef = useRef(0);
  const repositioningRef = useRef(false);
  const measureRef = useRef<(() => void) | null>(null);
  const [slot, setSlot] = useState(origin);
  const [radius, setRadius] = useState(5);
  const start = Math.max(0, slot - radius);
  const end = Math.min(totalSlots, slot + radius + 1);
  const active = count ? modulo(slot - origin, count) : 0;
  const indexForSlot = (rowSlot: number) => modulo(rowSlot - origin, count);

  useLayoutEffect(() => {
    setLoopReady(true);
  }, []);

  const paintRows = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll) {
      return;
    }
    const position = scroll.scrollTop / rowHeightRef.current;
    rowsRef.current.forEach((row, rowSlot) => {
      const depth = Math.min(Math.abs(rowSlot - position), 3);
      row.style.setProperty('--row-opacity', `${Math.max(0.12, 1 - depth * 0.32)}`);
    });
  }, [scrollRef]);

  const update = useCallback(() => {
    const scroll = scrollRef.current;
    if (!scroll || !count || repositioningRef.current) {
      return;
    }
    const actualHeight = rowsRef.current.values().next().value?.getBoundingClientRect().height;
    if (actualHeight && Math.abs(actualHeight - rowHeightRef.current) > 0.01) {
      // A resize can dispatch scroll before ResizeObserver. Never interpret the
      // browser's old offset using the previous responsive row height.
      measureRef.current?.();
      return;
    }
    const height = rowHeightRef.current;
    let next = Math.max(0, Math.min(totalSlots - 1, Math.round(scroll.scrollTop / height)));
    // Move the runway by full cycles so the visible posts and their positions do not change.
    if (circular && (next < 500 || next > SLOT_COUNT - 500)) {
      const shift = Math.round((ORIGIN - next) / count) * count;
      const top = scroll.scrollTop + shift * height;
      next += shift;
      slotRef.current = next;
      flushSync(() => setSlot(next));
      scroll.scrollTo({ top, behavior: 'instant' });
    } else if (slotRef.current !== next) {
      slotRef.current = next;
      // Mount the next window in this animation frame, including during a fast fling.
      flushSync(() => setSlot(next));
    }
    paintRows();
  }, [circular, count, paintRows, scrollRef, totalSlots]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const scroll = scrollRef.current;
    if (!root || !scroll) {
      return;
    }
    const measure = () => {
      // Custom properties can contain min()/calc(); measure the resolved row
      // instead, retaining fractional pixels to avoid runway-scale drift.
      const height =
        rowsRef.current.values().next().value?.getBoundingClientRect().height ||
        rowHeightRef.current;
      cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
      cancelAnimationFrame(resizeFrameRef.current);
      repositioningRef.current = true;
      scroll.style.scrollSnapType = 'none';
      rowHeightRef.current = height;
      setRadius(Math.max(4, Math.ceil(scroll.clientHeight / height / 2) + 2));
      scroll.scrollTo({ top: slotRef.current * height, behavior: 'instant' });
      paintRows();
      resizeFrameRef.current = requestAnimationFrame(() => {
        // React has committed the resized window before native snap is restored.
        scroll.scrollTo({ top: slotRef.current * rowHeightRef.current, behavior: 'instant' });
        resizeFrameRef.current = requestAnimationFrame(() => {
          scroll.style.scrollSnapType = '';
          repositioningRef.current = false;
          paintRows();
        });
      });
    };
    measureRef.current = measure;
    slotRef.current = origin;
    setSlot(origin);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    observer.observe(scroll);
    const onScroll = () => {
      if (frameRef.current) {
        return;
      }
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = 0;
        update();
      });
    };
    scroll.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      scroll.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frameRef.current);
      cancelAnimationFrame(resizeFrameRef.current);
      frameRef.current = 0;
      repositioningRef.current = false;
      scroll.style.scrollSnapType = '';
    };
  }, [origin, resetKey, count, paintRows, rootRef, scrollRef, update]);

  // Apply the current fade to newly mounted rows before the next frame.
  useLayoutEffect(paintRows, [paintRows, slot, radius, resetKey, count]);

  const moveToSlot = (target: number) => {
    const next = Math.max(0, Math.min(totalSlots - 1, target));
    const distant = Math.abs(next - slotRef.current) > radius;
    // Native scroll snap cannot target a row that has not mounted. Home/End jumps
    // mount their destination first; nearby arrow navigation remains smooth.
    if (distant) {
      slotRef.current = next;
      flushSync(() => setSlot(next));
    }
    scrollRef.current?.scrollTo({
      top: next * rowHeightRef.current,
      behavior: reduceMotion || distant ? 'instant' : 'smooth',
    });
    if (distant) {
      paintRows();
    }
  };

  const moveToIndex = (index: number) => {
    if (!count) {
      return;
    }
    const currentIndex = modulo(slotRef.current - origin, count);
    moveToSlot(slotRef.current + index - currentIndex);
  };

  return {
    active,
    slot,
    start,
    end,
    totalSlots,
    slots: Array.from({ length: Math.max(0, end - start) }, (_, index) => start + index),
    indexForSlot,
    styleForSlot: (rowSlot: number) =>
      ({
        '--row-opacity': Math.max(0.12, 1 - Math.min(Math.abs(rowSlot - slot), 3) * 0.32),
      }) as CSSProperties,
    registerRow: (rowSlot: number, element: HTMLLIElement | null) => {
      if (element) {
        rowsRef.current.set(rowSlot, element);
      } else {
        rowsRef.current.delete(rowSlot);
      }
    },
    moveToSlot,
    moveToIndex,
    moveBy: (delta: number) => moveToSlot(slotRef.current + delta),
  };
}
