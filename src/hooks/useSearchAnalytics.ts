'use client';

import { useCallback, useEffect, useRef } from 'react';
import { ANALYTICS_EVENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import { trackEvent } from '@/utils/analytics';

/** Report settled search results without collecting the search text. */
export function useSearchAnalytics(open: boolean, query: string, resultCount: number) {
  const lastResult = useRef<string | null>(null);
  const reportResults = useCallback(() => {
    if (!open || !query.trim()) {
      return;
    }
    const key = JSON.stringify([query, resultCount]);
    if (lastResult.current === key) {
      return;
    }
    lastResult.current = key;
    trackEvent(ANALYTICS_EVENTS.SEARCH_RESULTS, {
      section: ANALYTICS_SECTIONS.SEARCH,
      query_length: query.trim().length,
      result_count: resultCount,
      has_results: resultCount > 0,
    });
  }, [open, query, resultCount]);

  useEffect(() => {
    if (!open || !query.trim()) {
      lastResult.current = null;
      return;
    }
    const timer = setTimeout(reportResults, 400);
    return () => clearTimeout(timer);
  }, [open, query, reportResults]);

  // Flush before a result navigates away, even during the debounce window.
  return reportResults;
}
