'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useDesignTheme } from '@/context/DesignThemeContext';
import { getThemedHref } from '@/container/designs/theme';

export default function ThemedLink({ href, ...props }: ComponentProps<typeof Link>) {
  const { theme } = useDesignTheme();
  const target =
    typeof href === 'string'
      ? getThemedHref(href, theme)
      : { ...href, pathname: href.pathname ? getThemedHref(href.pathname, theme) : href.pathname };
  return <Link {...props} href={target} />;
}
