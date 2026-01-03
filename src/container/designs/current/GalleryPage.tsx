import React from 'react';

export default async function GalleryPageCurrent() {
  try {
    const mod = await import('@/container/designs/2026/GalleryPage');
    const Component = mod.default;
    return <Component />;
  } catch {
    const mod = await import('@/container/designs/2025/GalleryPage');
    const Component = mod.default;
    return <Component />;
  }
}


