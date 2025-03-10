import React from 'react';

interface GalleryIconProps {
  className?: string;
  pathClassName?: string;
}

export function GalleryIcon({ className = 'w-6 h-6', pathClassName = '' }: GalleryIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" className={pathClassName} />
      <circle cx="8.5" cy="8.5" r="1.5" className={pathClassName} />
      <polyline points="21 15 16 10 5 21" className={pathClassName} />
    </svg>
  );
}
