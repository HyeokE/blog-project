import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import './craft.css';

export const metadata: Metadata = {
  title: 'Craft | HYEOK.DEV',
  description: 'Small tools and experiments from HYEOK.DEV.',
};

export default function CraftPage() {
  return (
    <main className="craft-page">
      <div className="craft-shell">
        <header className="craft-header">
          <span className="craft-eyebrow">HYEOK.DEV / CRAFT</span>
          <h1>Craft</h1>
          <p>Small things made to be useful.</p>
        </header>
        <section aria-label="Projects" className="craft-projects">
          <Link className="craft-project" href="/craft/when-we-meet">
            <span className="craft-project-number" aria-hidden="true">01</span>
            <span className="craft-project-content">
              <strong>When We Meet</strong>
              <span>Find a time that works for everyone.</span>
            </span>
            <ArrowUpRight aria-hidden="true" size={28} strokeWidth={1.2} />
          </Link>
        </section>
      </div>
    </main>
  );
}
