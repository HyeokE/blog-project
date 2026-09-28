export const DESIGN_THEMES = [
  { id: 'sweet-home', label: 'Sweet Home', description: '빛과 여백으로 읽는 기록 · 최신 디자인' },
  { id: 'cloud', label: 'Cloud Dancer', description: '구름처럼 가볍고 부드러운 2026 디자인' },
  { id: '2025', label: '2025', description: '올리브 컬러의 오리지널 아카이브' },
] as const;

export type DesignTheme = (typeof DESIGN_THEMES)[number]['id'];
export const DEFAULT_DESIGN: DesignTheme = 'sweet-home';

export function isDesignTheme(value: unknown): value is DesignTheme {
  return DESIGN_THEMES.some(({ id }) => id === value);
}

export function resolveDesignTheme(pathname: string | null): DesignTheme {
  if (pathname === '/2025/light') {
    return 'sweet-home';
  }
  if (pathname === '/2025' || pathname?.startsWith('/2025/')) {
    return '2025';
  }
  if (pathname === '/2026' || pathname?.startsWith('/2026/')) {
    return 'cloud';
  }
  return DEFAULT_DESIGN;
}

export function normalizeThemePath(pathname: string): string {
  if (pathname === '/2025/light' || /^\/(2025|2026)$/.test(pathname)) {
    return '/';
  }
  return pathname.replace(/^\/(2025|2026)(?=\/)/, '');
}

export function getThemePath(pathname: string, theme: DesignTheme): string {
  const semanticPath = normalizeThemePath(pathname);
  // The design selector is shared by all themes.
  if (semanticPath === '/designs') {
    return theme === 'sweet-home' ? '/' : theme === 'cloud' ? '/2026' : '/2025';
  }
  const prefix = theme === 'sweet-home' ? '' : theme === 'cloud' ? '/2026' : '/2025';
  return `${prefix}${semanticPath === '/' ? '' : semanticPath}` || '/';
}

export function getThemedHref(href: string, theme: DesignTheme): string {
  const match = href.match(/^(\/[^?#]*)(.*)$/);
  if (!match) {
    return href;
  }
  const [, pathname, suffix] = match;
  if (
    !/^\/(?:about|gallery|personal|resume|about-design)?$/.test(pathname) &&
    !/^\/[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(pathname)
  ) {
    return href;
  }
  return `${getThemePath(pathname, theme)}${suffix}`;
}
