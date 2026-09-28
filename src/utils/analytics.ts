import {
  ANALYTICS_EVENTS,
  GA_MEASUREMENT_ID,
  type AnalyticsAction,
  type AnalyticsEvent,
} from '@/constants/analytics';

import { getCommonEnvironment } from '@/utils/analyticsEnvironment';

type EventParameters = Record<string, string | number | boolean>;
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  blogAnalyticsInitialized?: boolean;
};

/** Only public UI metadata belongs here. Never pass input values or search text. */
export function analyticsLabel(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
}

export function analyticsUrl(value: string, base: string): string {
  try {
    const url = new URL(value, base);
    if (url.protocol === 'mailto:' || url.protocol === 'tel:') {
      return url.protocol;
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

export function initializeAnalytics(): void {
  if (typeof window === 'undefined') {
    return;
  }
  const analytics = window as AnalyticsWindow;
  if (analytics.blogAnalyticsInitialized) {
    return;
  }
  const queue = (analytics.dataLayer = analytics.dataLayer || []);
  analytics.gtag = function () {
    // gtag's queue expects Arguments objects, not plain event objects.
    queue.push(arguments);
  };
  analytics.gtag('js', new Date());
  analytics.gtag('config', GA_MEASUREMENT_ID);
  analytics.blogAnalyticsInitialized = true;
}

export function trackEvent(name: AnalyticsEvent, parameters: EventParameters = {}): void {
  if (typeof window === 'undefined') {
    return;
  }
  initializeAnalytics();
  const safeParameters = Object.fromEntries(
    Object.entries(parameters).map(([key, value]) => [
      key,
      typeof value === 'string' ? analyticsLabel(value) : value,
    ]),
  );
  (window as AnalyticsWindow).gtag?.('event', name, {
    ...safeParameters,
    ...getCommonEnvironment(),
    send_to: GA_MEASUREMENT_ID,
    page_path: window.location.pathname,
    page_location: analyticsUrl(window.location.href, window.location.origin),
    design_theme: document.documentElement.dataset.design || 'unknown',
    color_mode: document.documentElement.dataset.mode || 'unknown',
  });
}

export function trackInteraction(action: AnalyticsAction, parameters: EventParameters = {}): void {
  trackEvent(ANALYTICS_EVENTS.UI_INTERACTION, { ...parameters, action });
}

export const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[data-analytics-label]',
].join(',');

export function interactiveTarget(target: EventTarget | null): Element | null {
  const source = target instanceof Element ? target : null;
  if (!source || source.closest('[data-analytics-ignore="true"]')) {
    return null;
  }
  const element = source.closest(INTERACTIVE_SELECTOR);
  if (!element || element.matches(':disabled, [aria-disabled="true"]')) {
    return null;
  }
  if (element.getAttribute('data-analytics-click-self') === 'true' && source !== element) {
    return null;
  }
  return element;
}

export function elementParameters(element: Element): EventParameters {
  const isField = element.matches('input, textarea, select, form, [contenteditable="true"]');
  const label =
    element.getAttribute('data-analytics-label') ||
    element.getAttribute('aria-label') ||
    element.getAttribute('title') ||
    (isField ? element.getAttribute('name') : element.textContent) ||
    element.tagName.toLowerCase();
  const parameters: EventParameters = {
    element_name: analyticsLabel(label),
    element_type: element.getAttribute('role') || element.tagName.toLowerCase(),
  };
  const id = element.getAttribute('data-analytics-id');
  if (id) {
    parameters.content_id = id;
  }
  const section = element.closest('[data-analytics-section]');
  if (section) {
    parameters.section = section.getAttribute('data-analytics-section') || '';
  }
  if (element.matches('a[href]')) {
    const href = element.getAttribute('href') || '';
    const safeUrl = analyticsUrl(href, window.location.href);
    parameters.link_url = safeUrl;
    parameters.link_type = href.startsWith('#')
      ? 'anchor'
      : href.startsWith('mailto:')
        ? 'email'
        : href.startsWith('tel:')
          ? 'phone'
          : safeUrl.startsWith(`${window.location.origin}/`)
            ? 'internal'
            : 'external';
  }
  if (element instanceof HTMLInputElement) {
    parameters.field_type = element.type;
    if (['checkbox', 'radio'].includes(element.type)) {
      parameters.checked = element.checked;
    }
  }
  return parameters;
}
