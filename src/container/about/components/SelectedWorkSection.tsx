'use client';

import Link from 'next/link';
import { BlurFade } from '@/components/BlurFade';
import type { PortfolioCompanyGroup, PortfolioLink, PortfolioProject } from '../data';

interface SelectedWorkSectionProps {
  companyGroups: PortfolioCompanyGroup[];
}

function ProjectLink({ link }: { link: PortfolioLink }) {
  const className =
    'text-sm text-foreground underline underline-offset-4 decoration-border transition-colors duration-200 hover:decoration-foreground';

  if (link.external === false) {
    return (
      <Link href={link.href} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label} ↗
    </a>
  );
}

function ProjectBlock({ project, index }: { project: PortfolioProject; index: number }) {
  return (
    <BlurFade delay={index * 0.08} inView inViewMargin="-60px" duration={0.5}>
      <div className="border-t border-border/30 py-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
          <h4 className="text-lg font-semibold text-foreground md:text-xl">
            {project.title}
          </h4>
          <span className="text-xs tracking-[0.12em] text-muted-foreground/50 uppercase">
            {project.role} · {project.period}
          </span>
        </div>

        <p className="mt-3 text-[15px] leading-[1.75] text-foreground/80">
          {project.summary}
        </p>

        {/* P / D / I — compact 2-column grid */}
        <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-3">
          {[
            { label: 'Problem', text: project.problem },
            { label: 'Decision', text: project.decision },
            { label: 'Impact', text: project.outcome },
          ].map(({ label, text }) => (
            <div key={label}>
              <p className="text-[10px] font-medium tracking-[0.2em] text-muted-foreground/40 uppercase">
                {label}
              </p>
              <p className="mt-1 text-[13px] leading-[1.7] text-foreground/60">
                {text}
              </p>
            </div>
          ))}
        </div>

        {/* Stack + Links inline */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
          {project.stack.map((s) => (
            <span
              key={s}
              className="rounded-full bg-foreground/[0.04] px-2.5 py-0.5 text-[11px] text-muted-foreground/60"
            >
              {s}
            </span>
          ))}
          {project.links.length > 0 && (
            <>
              <span className="text-border">·</span>
              {project.links.map((link) => (
                <ProjectLink key={`${project.title}-${link.label}`} link={link} />
              ))}
            </>
          )}
        </div>
      </div>
    </BlurFade>
  );
}

function CompanyBlock({ group, index }: { group: PortfolioCompanyGroup; index: number }) {
  return (
    <BlurFade delay={0.05} inView inViewMargin="-40px" duration={0.5}>
      <section className={index > 0 ? 'mt-16 md:mt-20' : ''}>
        {/* Company header — 2-column: left meta, right intro */}
        <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:gap-10">
          <div>
            <h3 className="font-serif-home text-3xl font-semibold text-foreground italic md:text-4xl">
              {group.company}
            </h3>
            <p className="mt-1 text-xs tracking-[0.16em] text-muted-foreground/50 uppercase">
              {group.role} · {group.period}
            </p>
          </div>
          {group.intro && (
            <p className="text-[15px] leading-[1.75] text-foreground/70 lg:pt-2">
              {group.intro}
            </p>
          )}
        </div>

        {/* Projects */}
        <div className="mt-8">
          {group.projects.map((project, projectIndex) => (
            <ProjectBlock
              key={`${group.company}-${project.title}`}
              project={project}
              index={projectIndex}
            />
          ))}
        </div>
      </section>
    </BlurFade>
  );
}

export function SelectedWorkSection({ companyGroups }: SelectedWorkSectionProps) {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        {/* Section header */}
        <BlurFade delay={0} inView inViewMargin="-80px" duration={0.5}>
          <h2 className="font-serif-home text-4xl font-semibold text-foreground italic md:text-6xl">
            Selected Work
          </h2>
          <p className="mt-3 max-w-lg text-base leading-[1.75] text-muted-foreground">
            문제를 정리하고 구조를 바꾼 작업을 중심으로 골랐습니다.
          </p>
        </BlurFade>

        {/* Company groups */}
        <div className="mt-14 md:mt-18">
          {companyGroups.map((group, index) => (
            <CompanyBlock key={`${group.company}-${group.period}`} group={group} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
