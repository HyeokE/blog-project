'use client';
import { useState, useEffect, useCallback } from 'react';

export const useSnapCenter = <T>(
  snapSelector: string,
  getValue: (element: Element) => T,
  defaultValue: T,
  options: {
    root?: Element | null;
    threshold?: number | number[];
    rootMargin?: string;
  } = {},
): T => {
  const [centerValue, setCenterValue] = useState<T>(defaultValue);

  const memoizedGetValue = useCallback(getValue, []);

  useEffect(() => {
    const { root = null, threshold = 0.5, rootMargin = '-46% 0px -46% 0px' } = options;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const value = memoizedGetValue(entry.target);
            if (value !== null) {
              setCenterValue(value);
            }
          }
        });
      },
      { root, threshold, rootMargin },
    );

    const elements = document.querySelectorAll(snapSelector);
    if (elements.length === 0) {
      console.warn(`No elements found for selector: ${snapSelector}`);
      return;
    }

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [snapSelector, memoizedGetValue, options]);

  return centerValue;
};
