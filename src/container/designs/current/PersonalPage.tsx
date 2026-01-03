import React from 'react';

export default async function Personal() {
  try {
    const mod = await import('@/container/designs/2026/PersonalPage');
    const Component = mod.default;
    return <Component />;
  } catch {
    const mod = await import('@/container/designs/2025/PersonalPage');
    const Component = mod.default;
    return <Component />;
  }
}


