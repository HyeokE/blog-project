import type { ReactNode } from 'react';
import ShadeFinder from '@/features/shade-finder/ShadeFinder';
import '@/features/shade-finder/shade-finder.css';

export default function ShadeFinderLayout({ children }: { children: ReactNode }) {
  return <><ShadeFinder />{children}</>;
}
