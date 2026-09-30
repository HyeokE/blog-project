'use client';

import WallPageShell from '@/container/light-wall/WallPageShell';
import SiteError from '@/components/site-error/SiteError';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <WallPageShell lighting={false}>
      <SiteError status="500" retry={<button type="button" onClick={reset}>다시 시도</button>} />
    </WallPageShell>
  );
}
