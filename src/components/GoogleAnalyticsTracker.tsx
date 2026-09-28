'use client';

import { ANALYTICS_EVENTS, GA_MEASUREMENT_ID } from '@/constants/analytics';
import { useEffect, useRef } from 'react';
import {
  getCommonEnvironment,
  getDetailedEnvironment,
  getNetworkConnection,
} from '@/utils/analyticsEnvironment';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import {
  analyticsUrl,
  elementParameters,
  initializeAnalytics,
  interactiveTarget,
  trackEvent,
} from '@/utils/analytics';

/** One root-level listener also covers portals, Notion content and future links. */
export default function GoogleAnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const environmentSnapshots = useRef(new Map<string, string>());

  useEffect(() => {
    if (!pathname || lastPath.current === pathname) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      const previousPath = lastPath.current;
      lastPath.current = pathname;
      // Run after theme effects; keep separate from automatic GA page_view.
      trackEvent(ANALYTICS_EVENTS.PAGE_LOAD, {
        navigation_type: previousPath ? 'client' : 'initial',
        previous_path: previousPath || '',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const report = () => {
      const details = getDetailedEnvironment();
      details.network.referrer_url = analyticsUrl(document.referrer, window.location.origin);
      const common = getCommonEnvironment();
      const groups = [
        [ANALYTICS_EVENTS.ENVIRONMENT_BROWSER, details.browser],
        [ANALYTICS_EVENTS.ENVIRONMENT_DEVICE, details.device],
        [ANALYTICS_EVENTS.ENVIRONMENT_NETWORK, details.network],
      ] as const;
      for (const [event, parameters] of groups) {
        const signature = JSON.stringify([pathname, common, parameters]);
        if (environmentSnapshots.current.get(event) !== signature) {
          environmentSnapshots.current.set(event, signature);
          trackEvent(event, parameters);
        }
      }
    };
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(report, 300);
    };
    const frame = requestAnimationFrame(report);
    const connection = getNetworkConnection();
    const preferences = [
      '(prefers-reduced-motion: reduce)',
      '(prefers-color-scheme: dark)',
      '(display-mode: standalone)',
    ].flatMap((query) =>
      typeof window.matchMedia === 'function' ? [window.matchMedia(query)] : [],
    );
    window.addEventListener('resize', onChange, { passive: true });
    window.addEventListener('online', onChange);
    window.addEventListener('offline', onChange);
    connection?.addEventListener('change', onChange);
    preferences.forEach((query) => query.addEventListener?.('change', onChange));
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('online', onChange);
      window.removeEventListener('offline', onChange);
      connection?.removeEventListener('change', onChange);
      preferences.forEach((query) => query.removeEventListener?.('change', onChange));
    };
  }, [pathname]);

  useEffect(() => {
    initializeAnalytics();
    const editedFields = new WeakSet<Element>();
    const scrollMilestones = new WeakMap<Element, Set<number>>();

    const onClick = (event: MouseEvent) => {
      if (event.type === 'auxclick' && event.button !== 1) {
        return;
      }
      const element = interactiveTarget(event.target);
      if (element) {
        trackEvent(ANALYTICS_EVENTS.UI_CLICK, {
          ...elementParameters(element),
          interaction_method: event.detail === 0 ? 'keyboard' : 'pointer',
          mouse_button: event.button,
        });
      }
    };

    const onInput = (event: Event) => {
      const element = interactiveTarget(event.target);
      if (!element?.matches('input, textarea, select')) {
        return;
      }
      // Password/hidden/file inputs never contribute field metadata.
      if (element.matches('input[type="password"], input[type="file"], input[type="hidden"]')) {
        return;
      }
      const textField = element.matches(
        'textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"])',
      );
      // Native text change fires again on blur; input already covers the edit.
      if ((textField && event.type !== 'input') || (!textField && event.type !== 'change')) {
        return;
      }
      const parameters = elementParameters(element);
      if (textField) {
        if (!editedFields.has(element)) {
          editedFields.add(element);
          trackEvent(ANALYTICS_EVENTS.UI_INPUT, parameters);
        }
      } else {
        // No .value collection, including freeform option values.
        trackEvent(ANALYTICS_EVENTS.UI_CHANGE, parameters);
      }
    };

    const onFocusOut = (event: FocusEvent) => {
      if (event.target instanceof Element) {
        editedFields.delete(event.target);
      }
    };

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (form instanceof HTMLFormElement && !form.closest('[data-analytics-ignore="true"]')) {
        trackEvent(ANALYTICS_EVENTS.FORM_SUBMIT, elementParameters(form));
      }
    };

    const onToggle = (event: Event) => {
      const details = event.target;
      if (
        details instanceof HTMLDetailsElement &&
        !details.closest('[data-analytics-ignore="true"]')
      ) {
        trackEvent(ANALYTICS_EVENTS.UI_EXPAND, {
          ...elementParameters(details.querySelector('summary') || details),
          expanded: details.open,
        });
      }
    };

    const onScroll = (event: Event) => {
      const element = event.target === document ? document.scrollingElement : event.target;
      if (!(element instanceof Element)) {
        return;
      }
      const isDocument = element === document.scrollingElement;
      // Virtual circular lists opt out: their physical scroll position is not reading progress.
      if (!isDocument && !element.matches('[data-analytics-scroll]')) {
        return;
      }
      if (element.closest('[data-analytics-ignore="true"]')) {
        return;
      }
      const distance = element.scrollHeight - element.clientHeight;
      if (distance <= 0 || element.scrollTop <= 0) {
        return;
      }
      const percent = Math.min(100, Math.round((element.scrollTop / distance) * 100));
      const sent = scrollMilestones.get(element) || new Set<number>();
      scrollMilestones.set(element, sent);
      for (const milestone of [25, 50, 75, 90]) {
        if (percent >= milestone && !sent.has(milestone)) {
          sent.add(milestone);
          trackEvent(ANALYTICS_EVENTS.CONTENT_SCROLL, {
            percent_scrolled: milestone,
            scroll_area: isDocument
              ? 'page'
              : element.getAttribute('data-analytics-scroll') || 'content',
          });
        }
      }
    };

    document.addEventListener('click', onClick, true);
    document.addEventListener('auxclick', onClick, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('change', onInput, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('toggle', onToggle, true);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('auxclick', onClick, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('change', onInput, true);
      document.removeEventListener('focusout', onFocusOut, true);
      document.removeEventListener('submit', onSubmit, true);
      document.removeEventListener('toggle', onToggle, true);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [pathname]);

  return (
    <Script
      id="blog-google-analytics"
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  );
}
