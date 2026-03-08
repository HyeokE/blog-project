'use client';

import { BlurFade } from '@/components/BlurFade';
import type { WorkPrinciple } from '../data';

interface WorkPrinciplesSectionProps {
  principles: WorkPrinciple[];
}

export function WorkPrinciplesSection({ principles }: WorkPrinciplesSectionProps) {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <BlurFade delay={0} inView inViewMargin="-80px" duration={0.5}>
          <h2 className="font-serif-home text-4xl font-semibold text-foreground italic md:text-6xl">
            Principles
          </h2>
        </BlurFade>

        {/* 2-column grid for density */}
        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {principles.map((principle, index) => (
            <BlurFade
              key={principle.title}
              delay={0.05 + index * 0.06}
              inView
              inViewMargin="-40px"
              duration={0.5}
            >
              <div>
                <span className="text-xs font-medium text-muted-foreground/30">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1.5 text-base font-semibold leading-snug text-foreground md:text-lg">
                  {principle.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.75] text-muted-foreground">
                  {principle.description}
                </p>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
