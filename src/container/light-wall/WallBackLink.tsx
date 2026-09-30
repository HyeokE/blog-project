import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

export default function WallBackLink({ href, children, className = '', ...props }: {
  href: string;
  children: ReactNode;
  className?: string;
  'aria-label'?: string;
  'data-analytics-label'?: string;
  'data-analytics-id'?: string;
}) {
  return <Link href={href} className={`wall-context-back ${className}`} {...props}>
    <ArrowLeft size={14} aria-hidden="true" />{children}
  </Link>;
}
