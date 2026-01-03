import React from 'react';

export default async function Home() {
  try {
    const mod = await import('@/container/designs/2026/HomePage');
    const Component = mod.default;
    return <Component />;
  } catch {
    const mod = await import('@/container/designs/2025/HomePage');
    const Component = mod.default;
    return <Component />;
  }
}


