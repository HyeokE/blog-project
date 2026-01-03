import React from 'react';

export default async function RootLayoutExtras() {
  try {
    const mod = await import('@/container/designs/2026/RootLayoutExtras');
    const Component = mod.default;
    return <Component />;
  } catch {
    const mod = await import('@/container/designs/2025/RootLayoutExtras');
    const Component = mod.default;
    return <Component />;
  }
}


