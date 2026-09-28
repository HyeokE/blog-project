type Parameters = Record<string, string | number | boolean>;

type Connection = EventTarget & {
  effectiveType?: string;
  type?: string;
  downlink?: number;
  downlinkMax?: number;
  rtt?: number;
  saveData?: boolean;
};

type BrowserNavigator = Navigator & {
  connection?: Connection;
  mozConnection?: Connection;
  webkitConnection?: Connection;
  deviceMemory?: number;
  standalone?: boolean;
  userAgentData?: {
    mobile?: boolean;
    platform?: string;
    brands?: Array<{ brand: string; version: string }>;
  };
};

export function getNetworkConnection(): Connection | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const browser = window.navigator as BrowserNavigator;
  return browser.connection || browser.mozConnection || browser.webkitConnection;
}

function media(query: string): boolean | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : undefined;
}

/** Browser-reported capability metadata only: no permissions or fingerprint IDs. */
export function getCommonEnvironment(): Parameters {
  if (typeof window === 'undefined') {
    return {};
  }
  const browser = window.navigator as BrowserNavigator;
  const ua = browser.userAgent;
  const tablet =
    /iPad|Tablet/i.test(ua) ||
    (/Macintosh/i.test(ua) && browser.maxTouchPoints > 1) ||
    (/Android/i.test(ua) && !/Mobile/i.test(ua));
  // Device category is an inference; GA also provides its own device category.
  const deviceType = tablet
    ? 'tablet'
    : browser.userAgentData?.mobile || /Mobi|iPhone|iPod/i.test(ua)
      ? 'mobile'
      : 'desktop';
  return {
    app_device_type: deviceType,
    device_platform: browser.userAgentData?.platform || browser.platform || 'unknown',
    browser_language: browser.language || 'unknown',
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    network_type: getNetworkConnection()?.effectiveType || 'unknown',
    online: browser.onLine,
  };
}

export function getDetailedEnvironment(): {
  browser: Parameters;
  device: Parameters;
  network: Parameters;
} {
  if (typeof window === 'undefined') {
    return { browser: {}, device: {}, network: {} };
  }
  const browser = window.navigator as BrowserNavigator;
  const connection = getNetworkConnection();
  const screen = window.screen;
  const browserMatch = browser.userAgent.match(/(Firefox|FxiOS|CriOS|Chrome|Version)\/([\d.]+)/);
  const browserNames: Record<string, string> = {
    Edg: 'Edge',
    EdgiOS: 'Edge',
    EdgA: 'Edge',
    SamsungBrowser: 'Samsung Internet',
    CriOS: 'Chrome',
    FxiOS: 'Firefox',
    OPR: 'Opera',
    Firefox: 'Firefox',
    Chrome: 'Chrome',
    Version: 'Safari',
  };
  // Edge/Opera user agents also contain Chrome; prefer their final product token.
  const product =
    browser.userAgent.match(/(Edg|EdgiOS|EdgA|OPR|SamsungBrowser)\/([\d.]+)/) || browserMatch;
  let timezone = 'unknown';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown';
  } catch {
    // Some embedded browsers do not expose Intl time zones.
  }
  const browserInfo: Parameters = {
    browser_name: product ? browserNames[product[1]] : 'unknown',
    browser_version: product?.[2] || 'unknown',
    browser_brands:
      browser.userAgentData?.brands
        ?.map(({ brand, version }) => `${brand}/${version}`)
        .join(', ') || 'unavailable',
    browser_languages: browser.languages?.join(',') || browser.language,
    timezone,
    timezone_offset_minutes: new Date().getTimezoneOffset(),
    cookies_enabled: browser.cookieEnabled,
    secure_context: window.isSecureContext,
    display_mode:
      browser.standalone || media('(display-mode: standalone)')
        ? 'standalone'
        : typeof window.matchMedia === 'function'
          ? 'browser'
          : 'unknown',
    reduced_motion: media('(prefers-reduced-motion: reduce)') ?? 'unknown',
    preferred_color_scheme: media('(prefers-color-scheme: dark)')
      ? 'dark'
      : media('(prefers-color-scheme: light)')
        ? 'light'
        : 'unknown',
  };
  const device: Parameters = {
    screen_width: screen.width,
    screen_height: screen.height,
    screen_available_width: screen.availWidth,
    screen_available_height: screen.availHeight,
    pixel_ratio: window.devicePixelRatio,
    color_depth: screen.colorDepth,
    max_touch_points: browser.maxTouchPoints,
    orientation:
      screen.orientation?.type ||
      (window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'),
    pointer_type: media('(pointer: coarse)')
      ? 'coarse'
      : media('(pointer: fine)')
        ? 'fine'
        : typeof window.matchMedia === 'function'
          ? 'none'
          : 'unknown',
  };
  if (typeof browser.hardwareConcurrency === 'number') {
    device.cpu_threads = browser.hardwareConcurrency;
  }
  if (typeof browser.deviceMemory === 'number') {
    device.device_memory_gb = browser.deviceMemory;
  }
  const navigation = window.performance?.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;
  const network: Parameters = {
    connection_type: connection?.type || 'unknown',
    visibility_state: document.visibilityState,
    document_navigation_type: navigation?.type || 'unknown',
  };
  if (connection) {
    for (const [key, value] of Object.entries({
      downlink_mbps: connection.downlink,
      max_downlink_mbps: connection.downlinkMax,
      network_rtt_ms: connection.rtt,
      save_data: connection.saveData,
    })) {
      if (typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) {
        network[key] = value;
      }
    }
  }
  return { browser: browserInfo, device, network };
}
