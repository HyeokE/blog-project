import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import './craft.css';
import './legal.css';
import {ANALYTICS_ELEMENTS,ANALYTICS_SECTIONS} from '@/constants/analytics';

export const metadata: Metadata = {
  title: 'Craft | HYEOK.DEV',
  description: 'Small tools and experiments from HYEOK.DEV.',
};

export default function CraftPage() {
  return (
    <main className="craft-page">
      <div className="craft-shell">
        <header className="craft-header">
          <h1>Craft</h1>
          <p>Small things made to be useful.</p>
        </header>
        <section aria-label="Projects" className="craft-projects" data-analytics-section={ANALYTICS_SECTIONS.CRAFT_PROJECTS}>
          <Link className="craft-project" href="/craft/when-we-meet" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_PROJECT}>
            <span className="craft-project-content">
              <strong>When We Meet</strong>
              <span>Find a time that works for everyone.</span>
            </span>
            <ArrowUpRight aria-hidden="true" size={24} strokeWidth={1.5} />
          </Link>
        </section>
        <nav className="craft-legal-links" aria-label="Craft information">
          <Link href="/craft/privacy" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_LINK}>Privacy Policy</Link>
          <Link href="/craft/terms" data-analytics-label={ANALYTICS_ELEMENTS.CRAFT_LEGAL_LINK}>Terms of Service</Link>
        </nav>
      </div>
    </main>
  );
}
