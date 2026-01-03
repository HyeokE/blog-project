'use client';

import { createContext, useContext, type RefObject } from 'react';

export const ScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(null);

export const useScrollContext = () => {
  return useContext(ScrollContext);
};
