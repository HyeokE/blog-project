'use client';
import React from 'react';
import { OverlayProvider as OverlayProviderKit } from 'overlay-kit';

interface OverlayProviderProps {
  children: React.ReactNode;
}

const OverlayProvider = ({ children }: OverlayProviderProps) => {
  return <OverlayProviderKit>{children}</OverlayProviderKit>;
};

export default OverlayProvider;
