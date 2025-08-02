// components/ClientPortal.tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ClientPortalProps {
  children: React.ReactNode;
}

export default function ClientPortal({ children }: ClientPortalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return null;
  }
  const portalRoot = document.getElementById('portal-root');
  return portalRoot ? createPortal(children, portalRoot) : null;
}
