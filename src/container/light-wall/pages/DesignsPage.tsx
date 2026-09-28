'use client';

import { Check, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useDesignTheme } from '@/context/DesignThemeContext';
import { DESIGN_THEMES } from '@/container/designs/theme';
import WallPageShell from '../WallPageShell';

export default function DesignsPage() {
  const { theme, setTheme } = useDesignTheme();
  return (
    <WallPageShell>
      <section className="wall-designs-content">
        <header className="wall-page-intro">
          <h1>DESIGN ARCHIVE</h1>
        </header>
        <div className="wall-design-options" aria-label="블로그 디자인 선택">
          {DESIGN_THEMES.map((design, index) => (
            <button
              key={design.id}
              type="button"
              className="wall-design-option"
              data-design={design.id}
              aria-pressed={theme === design.id}
              onClick={() => setTheme(design.id)}
            >
              <span className="wall-design-swatch" aria-hidden="true">
                <span>Aa</span>
              </span>
              <span className="wall-design-label">
                <small>0{index + 1}</small>
                <strong>{design.label}</strong>
                {theme === design.id && <Check size={16} />}
              </span>
              <span className="wall-design-description">{design.description}</span>
              <span className="wall-design-action">
                {theme === design.id ? '현재 디자인' : '이 디자인 사용하기'}
                <ArrowUpRight size={14} />
              </span>
            </button>
          ))}
        </div>
        <Link href="/about-design" className="wall-page-back">
          디자인 이야기 <ArrowUpRight size={14} />
        </Link>
      </section>
    </WallPageShell>
  );
}
