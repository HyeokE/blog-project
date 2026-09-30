'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/**
 * Pre-paint inline script (Next 16 guide: "Preventing flash before hydration").
 * SSR and hydration render the same executable `text/javascript` element, so the script runs while the HTML is
 * parsed and hydration matches it (React skips a head <script> whose type differs, which duplicates it and breaks
 * hydration of the following head nodes). Only an instance React creates on the client (a client re-render of the
 * root) renders as an inert `text/plain` data block: such scripts never execute anyway, and React then does not warn
 * "Encountered a script tag while rendering React component".
 */
export function InlineScript({ html }: { html: string }) {
  const serverOrHydrating = useSyncExternalStore(subscribe, () => false, () => true);
  return (
    <script
      type={serverOrHydrating ? 'text/javascript' : 'text/plain'}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
