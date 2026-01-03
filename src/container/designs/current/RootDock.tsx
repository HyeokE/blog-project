'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { getDesignRegistryByYear, parseYearFromPath } from '@/container/designs/registry';

export default function RootDock() {
  const pathname = usePathname();
  const year = parseYearFromPath(pathname);
  const { RootDock } = getDesignRegistryByYear(year);
  return <RootDock />;
}


