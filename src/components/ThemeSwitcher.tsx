'use client';

import { ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import { DESIGN_THEMES, isDesignTheme } from '@/container/designs/theme';
import { useDesignTheme } from '@/context/DesignThemeContext';

export default function ThemeSwitcher() {
  const { theme, setTheme } = useDesignTheme();
  if (theme === 'sweet-home') {
    return null;
  }
  return (
    <label className="border-border bg-background/90 text-muted-foreground fixed top-4 right-4 z-[60] flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-sm backdrop-blur-md">
      <span>DESIGN</span>
      <select
        data-analytics-label={ANALYTICS_ELEMENTS.DESIGN_SELECT}
        data-analytics-section={ANALYTICS_SECTIONS.DESIGN_PICKER}
        data-analytics-id={theme}
        aria-label="블로그 디자인 변경"
        value={theme}
        className="text-foreground max-w-28 cursor-pointer bg-transparent outline-offset-4"
        onChange={(event) => {
          if (isDesignTheme(event.target.value)) {
            setTheme(event.target.value);
          }
        }}
      >
        {DESIGN_THEMES.map(({ id, label }) => (
          <option key={id} value={id}>
            {label}
            {id === 'sweet-home' ? ' · NEW' : ''}
          </option>
        ))}
      </select>
    </label>
  );
}
