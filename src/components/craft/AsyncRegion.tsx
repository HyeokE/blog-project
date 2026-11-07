'use client';

import { Component, createContext, Suspense, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const LoadingContext = createContext<() => () => void>(() => () => undefined);

/** Multiple pending regions share a single live loading announcement. */
export function AsyncLoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);
  const register = useCallback(() => {
    setPending(count => count + 1);
    return () => setPending(count => count - 1);
  }, []);
  return <LoadingContext.Provider value={register}>
    <span className="sr-only" role="status" aria-live="polite">{pending > 0 ? '선택한 조건의 데이터를 불러오는 중이에요.' : ''}</span>
    {children}
  </LoadingContext.Provider>;
}

function PendingRegion({ children }: { children: ReactNode }) {
  const register = useContext(LoadingContext);
  useEffect(register, [register]);
  return <div aria-busy="true">{children}</div>;
}

type RegionProps = { children: ReactNode; fallback: ReactNode; onRetry: () => void; errorMessage: string };

class RegionBoundary extends Component<Omit<RegionProps, 'fallback'>, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) {return <Alert>
      <AlertDescription>
        <p>{this.props.errorMessage}</p>
        <Button variant="outline" onClick={() => { this.props.onRetry(); this.setState({ failed: false }); }}>다시 시도</Button>
      </AlertDescription>
    </Alert>;}
    return this.props.children;
  }
}

export function AsyncRegion({ queryKey, fallback, ...props }: RegionProps & { queryKey: string }) {
  return <RegionBoundary key={queryKey} {...props}>
    <Suspense fallback={<PendingRegion>{fallback}</PendingRegion>}>{props.children}</Suspense>
  </RegionBoundary>;
}
