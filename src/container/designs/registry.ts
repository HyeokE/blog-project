import type { ComponentType } from 'react';
import RootLayoutExtras2026 from '@/container/designs/2026/RootLayoutExtras';
import RootLayoutExtras2025 from '@/container/designs/2025/RootLayoutExtras';
import RootDock2026 from '@/container/designs/2026/RootDock';
import RootDock2025 from '@/container/designs/2025/RootDock';

// Client-side components only (RootLayoutExtras, RootDock)
// Server components (PersonalPage, GalleryPage) should be imported directly in pages
type ClientRegistry = {
  RootLayoutExtras: ComponentType<any>;
  RootDock: ComponentType<any>;
};

const CLIENT_DESIGN_REGISTRY: Record<string, ClientRegistry> = {
  '2026': {
    RootLayoutExtras: RootLayoutExtras2026,
    RootDock: RootDock2026,
  },
  '2025': {
    RootLayoutExtras: RootLayoutExtras2025,
    RootDock: RootDock2025,
  },
};

export function parseYearFromPath(pathname?: string): string | null {
  if (!pathname) {return null;}
  const match = pathname.match(/^\/(\d{4})(?:\/|$)/);
  return match ? match[1] : null;
}

export function getDesignRegistryByYear(year?: string | null): ClientRegistry {
  if (!year) {return CLIENT_DESIGN_REGISTRY['2026'];}
  if (CLIENT_DESIGN_REGISTRY[year]) {return CLIENT_DESIGN_REGISTRY[year];}
  // Fallback to latest (2026) if unknown year is requested
  return CLIENT_DESIGN_REGISTRY['2026'];
}



