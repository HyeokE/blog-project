import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { trackEvent } from '@/utils/analytics';

type WebVital = {
  name: string;
  id: string;
  value: number;
  delta: number;
  rating: string;
  navigationType: string;
};

const supportedMetrics = new Set(['CLS', 'FCP', 'FID', 'INP', 'LCP', 'TTFB']);
const reported = new Map<string, string>();

/** Stable callback for next/web-vitals; Vercel Speed Insights keeps its own collection. */
export function reportWebVital(metric: WebVital): void {
  if (
    typeof window === 'undefined' ||
    !supportedMetrics.has(metric.name) ||
    !metric.id ||
    !Number.isFinite(metric.value) ||
    metric.value < 0 ||
    !Number.isFinite(metric.delta)
  ) {
    return;
  }

  const key = `${metric.name}:${metric.id}`;
  const signature = `${metric.value}:${metric.delta}:${metric.rating}`;
  if (reported.get(key) === signature) {
    return;
  }
  reported.set(key, signature);
  if (reported.size > 256) {
    const oldest = reported.keys().next().value;
    if (oldest !== undefined) {
      reported.delete(oldest);
    }
  }

  // Web Vitals describe the document load, even if an SPA navigation happened before reporting.
  const navigation = window.performance?.getEntriesByType('navigation')[0];
  let measuredPath = window.location.pathname;
  try {
    measuredPath = new URL(navigation?.name || window.location.href).pathname;
  } catch {
    // Keep the current path when an embedded browser exposes no valid navigation URL.
  }

  trackEvent(ANALYTICS_EVENTS.WEB_VITAL, {
    metric_name: metric.name,
    metric_id: metric.id,
    metric_value: metric.value,
    metric_delta: metric.delta,
    metric_rating: metric.rating,
    metric_unit: metric.name === 'CLS' ? 'score' : 'ms',
    metric_page_path: measuredPath,
    navigation_type: metric.navigationType,
    measurement_source: 'next_web_vitals',
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    non_interaction: true,
    transport_type: 'beacon',
  });
}
