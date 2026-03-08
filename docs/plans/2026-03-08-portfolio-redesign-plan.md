# Portfolio Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the /about portfolio page with Apple-level cinematic scroll, glass material cards, and typography-first design.

**Architecture:** 6 component files modified in-place. Hero uses sticky scroll-driven parallax (useSectionScroll + useTransform). Remaining sections use BlurFade inView reveals. ScrollProgressBar added as fixed overlay. Section backgrounds alternate with gradient transitions.

**Tech Stack:** Next.js, motion/react, framer-motion, Tailwind CSS v4, existing useSectionScroll hook, BlurFade component, AirplaneWindow component.

---

### Task 1: AboutPortfolioScene — Orchestrator with Progress Bar + Background Rhythm

**Files:**
- Rewrite: `src/container/about/components/AboutPortfolioScene.tsx`

**Step 1: Write the complete file**

```tsx
'use client';

import { useScrollContext } from '@/context/ScrollContext';
import { motion, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import type { AboutProfile, PortfolioCompanyGroup, WorkPrinciple } from '../data';
import { AboutHeroSection } from './AboutHeroSection';
import { ContactSection } from './ContactSection';
import { SelectedWorkSection } from './SelectedWorkSection';
import { WorkPrinciplesSection } from './WorkPrinciplesSection';

interface AboutPortfolioSceneProps {
  profile: AboutProfile;
  companyGroups: PortfolioCompanyGroup[];
  principles: WorkPrinciple[];
}

function ScrollProgressBar() {
  const containerRef = useScrollContext();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (containerRef?.current) {
      setIsReady(true);
    }
    const timer = window.setTimeout(() => {
      if (containerRef?.current) setIsReady(true);
    }, 100);
    return () => window.clearTimeout(timer);
  }, [containerRef]);

  const { scrollYProgress } = useScroll({
    container: isReady && containerRef ? containerRef : undefined,
    layoutEffect: false,
  });

  return (
    <motion.div
      style={{ scaleX: scrollYProgress }}
      className="fixed top-0 right-0 left-0 z-50 h-[2px] bg-foreground/20 [transform-origin:left]"
    />
  );
}

function TintedSection({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-20 h-20 bg-gradient-to-b from-transparent to-brand-100 dark:to-[#1e1d1c]"
      />
      <div className="bg-brand-100 dark:bg-[#1e1d1c]">{children}</div>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-20 h-20 bg-gradient-to-t from-transparent to-brand-100 dark:to-[#1e1d1c]"
      />
    </div>
  );
}

export function AboutPortfolioScene({ profile, companyGroups, principles }: AboutPortfolioSceneProps) {
  return (
    <div className="relative">
      <ScrollProgressBar />
      <AboutHeroSection profile={profile} />
      <TintedSection>
        <SelectedWorkSection companyGroups={companyGroups} />
      </TintedSection>
      <WorkPrinciplesSection principles={principles} />
      <TintedSection>
        <ContactSection />
      </TintedSection>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors (other sections not yet updated, but types should pass)

**Step 3: Commit**

```bash
git add src/container/about/components/AboutPortfolioScene.tsx
git commit -m "refactor: add scroll progress bar and section background rhythm to portfolio orchestrator"
```

---

### Task 2: AboutHeroSection — Cinematic Sticky Hero

**Files:**
- Rewrite: `src/container/about/components/AboutHeroSection.tsx`

**Step 1: Write the complete file**

```tsx
'use client';

import Link from 'next/link';
import { motion, useTransform } from 'motion/react';
import { useReducedMotion } from 'framer-motion';
import { AirplaneWindow } from '@/components/airplane-window';
import type { AboutProfile } from '../data';
import { useSectionScroll } from './useSectionScroll';

interface AboutHeroSectionProps {
  profile: AboutProfile;
}

const ctaBase =
  'inline-flex items-center rounded-full px-6 py-3 text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:-translate-y-0.5';

export function AboutHeroSection({ profile }: AboutHeroSectionProps) {
  const { ref, scrollYProgress } = useSectionScroll<HTMLElement>();
  const reducedMotion = useReducedMotion();
  const noMotion = reducedMotion ?? false;

  // AirplaneWindow: visible at load, exits on scroll
  const windowOpacity = useTransform(scrollYProgress, [0.33, 0.48], [1, 0]);
  const windowScale = useTransform(
    scrollYProgress,
    [0.33, 0.48],
    [1, noMotion ? 1 : 0.82],
  );
  const windowY = useTransform(
    scrollYProgress,
    [0.33, 0.48],
    [0, noMotion ? 0 : -60],
  );

  // Content: appears as window leaves, fades at section end
  const contentOpacity = useTransform(
    scrollYProgress,
    [0.38, 0.52, 0.72, 0.88],
    [0, 1, 1, 0],
  );
  const contentScale = useTransform(
    scrollYProgress,
    [0.38, 0.52],
    [noMotion ? 1 : 0.92, 1],
  );
  const contentY = useTransform(
    scrollYProgress,
    [0.72, 0.88],
    [0, noMotion ? 0 : -40],
  );

  // Scroll indicator: visible initially, fades on first scroll
  const indicatorOpacity = useTransform(scrollYProgress, [0.33, 0.4], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-[200vh]">
      <div className="sticky top-0 flex h-dvh flex-col items-center justify-center overflow-hidden px-6">
        {/* AirplaneWindow — cinematic exit on scroll */}
        <motion.div
          style={{ opacity: windowOpacity, scale: windowScale, y: windowY }}
          className="absolute inset-0 z-10 flex items-center justify-center"
        >
          <AirplaneWindow size="about" />
        </motion.div>

        {/* Content — emerges as window recedes */}
        <motion.div
          style={{ opacity: contentOpacity, scale: contentScale, y: contentY }}
          className="relative z-20 mx-auto w-full max-w-4xl text-center"
        >
          <p className="font-sans-home text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
            {profile.heroEyebrow}
          </p>

          <h1 className="font-serif-home mt-8 text-[clamp(2.5rem,7vw,6rem)] leading-[1.06] font-semibold text-foreground italic">
            {profile.heroHeadline}
          </h1>

          <p className="mt-7 text-sm tracking-[0.22em] text-muted-foreground uppercase">
            {profile.name} &mdash; {profile.role}
          </p>

          <p className="mx-auto mt-10 max-w-2xl text-lg leading-[1.8] text-foreground/80 md:text-xl">
            {profile.heroSummary}
          </p>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-[1.8] text-muted-foreground">
            {profile.heroDescription}
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {profile.focusAreas.map((area) => (
              <span
                key={area}
                className="rounded-full border border-border bg-card/50 px-4 py-2 text-[11px] tracking-[0.18em] text-muted-foreground uppercase"
              >
                {area}
              </span>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/resume"
              className={`${ctaBase} bg-foreground text-background hover:bg-foreground/90`}
            >
              Resume
            </Link>
            <a
              href="https://github.com/HyeokE"
              target="_blank"
              rel="noopener noreferrer"
              className={`${ctaBase} border border-border text-foreground hover:border-foreground/30`}
            >
              GitHub
            </a>
            <a
              href="mailto:jhjeong00@gmail.com"
              className={`${ctaBase} border border-border text-foreground hover:border-foreground/30`}
            >
              Email
            </a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: indicatorOpacity }}
          className="absolute bottom-10 left-1/2 z-20 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] tracking-[0.3em] text-muted-foreground/50 uppercase">
              Scroll
            </span>
            <div className="h-10 w-px bg-gradient-to-b from-muted-foreground/30 to-transparent" />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/container/about/components/AboutHeroSection.tsx
git commit -m "feat: cinematic sticky hero with AirplaneWindow parallax exit"
```

---

### Task 3: SelectedWorkSection — Glass Gallery

**Files:**
- Rewrite: `src/container/about/components/SelectedWorkSection.tsx`

**Step 1: Write the complete file**

```tsx
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useInView } from 'framer-motion';
import { BlurFade } from '@/components/BlurFade';
import type { PortfolioCompanyGroup, PortfolioLink, PortfolioProject } from '../data';

interface SelectedWorkSectionProps {
  companyGroups: PortfolioCompanyGroup[];
}

const GLASS_CARD = [
  'rounded-3xl p-8 lg:p-10 backdrop-blur-xl transition-all duration-300',
  'bg-white/60 border border-white/80',
  'shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.04),0_12px_32px_rgba(0,0,0,0.06)]',
  'hover:-translate-y-0.5',
  'hover:shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_4px_8px_rgba(0,0,0,0.06),0_24px_48px_rgba(0,0,0,0.1)]',
  'dark:bg-white/5 dark:border-white/10',
  'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_2px_4px_rgba(0,0,0,0.2),0_12px_32px_rgba(0,0,0,0.3)]',
  'dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_4px_8px_rgba(0,0,0,0.25),0_24px_48px_rgba(0,0,0,0.4)]',
].join(' ');

const NESTED_GLASS =
  'rounded-2xl p-5 bg-background/60 border border-border/40 dark:bg-background/20 dark:border-white/5 transition-colors duration-300 hover:border-border/80 dark:hover:border-white/10';

function AnimatedDivider() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <div
      ref={ref}
      className="h-px bg-border transition-transform duration-[800ms] [transform-origin:left]"
      style={{
        transform: isInView ? 'scaleX(1)' : 'scaleX(0)',
        transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    />
  );
}

function ProjectLinkButton({ link }: { link: PortfolioLink }) {
  const className =
    'inline-flex items-center rounded-full border border-border px-4 py-2 text-[11px] tracking-[0.18em] text-foreground uppercase transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/25';

  if (link.external === false) {
    return (
      <Link href={link.href} className={className}>
        {link.label}
      </Link>
    );
  }

  return (
    <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
      {link.label}
    </a>
  );
}

function ProjectCard({ project, index }: { project: PortfolioProject; index: number }) {
  return (
    <BlurFade delay={index * 0.15} inView inViewMargin="-80px" yOffset={30} blur="12px" duration={0.7}>
      <article className={GLASS_CARD}>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              {project.period}
            </p>
            <h3 className="font-serif-home mt-4 text-3xl leading-tight font-semibold text-foreground italic md:text-4xl">
              {project.title}
            </h3>
            <p className="mt-3 text-sm tracking-[0.18em] text-muted-foreground uppercase">
              {project.role}
            </p>
            <p className="mt-6 text-base leading-[1.8] text-foreground/85 md:text-lg">
              {project.summary}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {project.stack.map((s) => (
                <span
                  key={s}
                  className="rounded-full border border-border/70 bg-background/60 px-3 py-1.5 text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-all duration-200 hover:scale-105 hover:border-border hover:bg-background/80"
                >
                  {s}
                </span>
              ))}
            </div>

            {project.links.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-3">
                {project.links.map((link) => (
                  <ProjectLinkButton key={`${project.title}-${link.label}`} link={link} />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            {[
              { label: 'Problem', text: project.problem },
              { label: 'Decision', text: project.decision },
              { label: 'Impact', text: project.outcome },
            ].map(({ label, text }) => (
              <div key={label} className={NESTED_GLASS}>
                <p className="text-[11px] tracking-[0.24em] text-muted-foreground/70 uppercase">
                  {label}
                </p>
                <p className="mt-2.5 text-sm leading-7 text-foreground/80">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </article>
    </BlurFade>
  );
}

function CompanyGroup({ group, index }: { group: PortfolioCompanyGroup; index: number }) {
  return (
    <section className="py-16 lg:py-20">
      <AnimatedDivider />

      <div className="mt-16 grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-16">
        <BlurFade delay={0} inView inViewMargin="-80px" yOffset={24} duration={0.6}>
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
              {group.period}
            </p>
            <h3 className="font-serif-home mt-4 text-3xl font-semibold text-foreground italic md:text-[3.5rem] md:leading-[1.08]">
              {group.company}
            </h3>
            <p className="mt-3 text-sm tracking-[0.18em] text-muted-foreground uppercase">
              {group.role}
            </p>
            {group.intro && (
              <p className="mt-6 text-sm leading-7 text-muted-foreground">{group.intro}</p>
            )}
          </aside>
        </BlurFade>

        <div className="space-y-6">
          {group.projects.map((project, projectIndex) => (
            <ProjectCard
              key={`${group.company}-${project.title}`}
              project={project}
              index={projectIndex}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export function SelectedWorkSection({ companyGroups }: SelectedWorkSectionProps) {
  return (
    <section className="px-6 py-28 lg:py-36">
      <div className="mx-auto max-w-5xl">
        <BlurFade delay={0} inView inViewMargin="-100px" yOffset={20} blur="8px" duration={0.6}>
          <p className="text-xs tracking-[0.26em] text-muted-foreground uppercase">
            Selected Work
          </p>
        </BlurFade>

        <BlurFade delay={0.1} inView inViewMargin="-100px" yOffset={20} blur="8px" duration={0.6}>
          <h2 className="font-serif-home mt-5 max-w-3xl text-4xl leading-tight font-semibold text-foreground italic md:text-6xl">
            좌측에는 맥락을, 우측에는 결과를 남겼습니다.
          </h2>
        </BlurFade>

        <BlurFade delay={0.2} inView inViewMargin="-100px" duration={0.6}>
          <p className="mt-6 max-w-2xl text-base leading-[1.8] text-muted-foreground md:text-lg">
            회사와 역할은 좌측 레일에 고정하고, 실제로 바꾼 프로젝트는 우측에서 하나씩 읽히도록
            구성했습니다. 단순한 기능 나열보다 문제를 정리하고 구조를 바꾼 작업을 중심으로
            골랐습니다.
          </p>
        </BlurFade>

        <div className="mt-12 lg:mt-16">
          {companyGroups.map((group, index) => (
            <CompanyGroup key={`${group.company}-${group.period}`} group={group} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/container/about/components/SelectedWorkSection.tsx
git commit -m "feat: glass material cards with animated dividers for selected work"
```

---

### Task 4: WorkPrinciplesSection — Precision Numbers

**Files:**
- Rewrite: `src/container/about/components/WorkPrinciplesSection.tsx`

**Step 1: Write the complete file**

```tsx
'use client';

import { BlurFade } from '@/components/BlurFade';
import type { WorkPrinciple } from '../data';

interface WorkPrinciplesSectionProps {
  principles: WorkPrinciple[];
}

export function WorkPrinciplesSection({ principles }: WorkPrinciplesSectionProps) {
  return (
    <section className="px-6 py-28 lg:py-36">
      <div className="mx-auto max-w-5xl">
        <BlurFade delay={0} inView inViewMargin="-80px" yOffset={20} blur="8px" duration={0.6}>
          <p className="text-xs tracking-[0.26em] text-muted-foreground uppercase">Principles</p>
        </BlurFade>

        <BlurFade delay={0.1} inView inViewMargin="-80px" yOffset={20} blur="8px" duration={0.6}>
          <h2 className="font-serif-home mt-5 max-w-3xl text-4xl leading-tight font-semibold text-foreground italic md:text-5xl">
            오래 남는 결정은 대부분 구조에서 시작됩니다.
          </h2>
        </BlurFade>

        <BlurFade delay={0.2} inView inViewMargin="-80px" duration={0.6}>
          <p className="mt-6 max-w-2xl text-base leading-[1.8] text-muted-foreground md:text-lg">
            화면 하나를 멋지게 만드는 것보다, 팀이 다음 화면을 더 잘 만들 수 있게 되는 구조를 더
            중요하게 봅니다.
          </p>
        </BlurFade>

        <div className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {principles.map((principle, index) => (
            <BlurFade
              key={principle.title}
              delay={0.3 + index * 0.1}
              inView
              inViewMargin="-80px"
              className="h-full"
              duration={0.6}
            >
              <article className="group relative h-full overflow-hidden rounded-3xl border border-border/50 bg-card/40 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_16px_48px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
                {/* Top accent line */}
                <div className="absolute inset-x-0 top-0 h-[2px] bg-foreground/10 transition-colors duration-300 group-hover:bg-foreground/30" />

                <span className="font-serif-home text-5xl font-extralight text-foreground/8 italic lg:text-7xl">
                  0{index + 1}
                </span>
                <h3 className="mt-8 text-lg leading-7 font-semibold text-foreground">
                  {principle.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {principle.description}
                </p>
              </article>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/container/about/components/WorkPrinciplesSection.tsx
git commit -m "feat: precision number principles with accent lines and hover lift"
```

---

### Task 5: ContactSection — The Invitation

**Files:**
- Rewrite: `src/container/about/components/ContactSection.tsx`

**Step 1: Write the complete file**

```tsx
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { useInView } from 'framer-motion';
import { BlurFade } from '@/components/BlurFade';

const ctaBase =
  'inline-flex items-center rounded-full px-6 py-3 text-xs tracking-[0.2em] uppercase transition-all duration-300 hover:-translate-y-0.5';

function ExpandingLine() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <div ref={ref} className="flex justify-center">
      <div
        className="h-px bg-border transition-all duration-700"
        style={{
          width: isInView ? '60%' : '0%',
          opacity: isInView ? 0.3 : 0,
          transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  );
}

export function ContactSection() {
  return (
    <section className="px-6 py-40 md:py-52">
      <ExpandingLine />

      <div className="mx-auto mt-16 max-w-3xl text-center">
        <BlurFade delay={0} inView inViewMargin="-80px">
          <p className="text-xs tracking-[0.26em] text-muted-foreground uppercase">Contact</p>
        </BlurFade>

        <BlurFade delay={0.1} inView inViewMargin="-80px" yOffset={12} duration={0.6}>
          <h2 className="font-serif-home mt-5 text-4xl leading-tight font-semibold text-foreground italic md:text-6xl">
            Let&apos;s build something clear.
          </h2>
        </BlurFade>

        <BlurFade delay={0.2} inView inViewMargin="-80px" duration={0.6}>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-[1.8] text-muted-foreground md:text-lg">
            실무 프로젝트, 디자인 시스템, 제품 경험 개선에 대해 이야기하고 싶다면 편하게 연락
            주세요. 이번 페이지의 서사가 끝나는 지점은 결국 다시 협업으로 이어진다고 생각합니다.
          </p>
        </BlurFade>

        <BlurFade delay={0.35} inView inViewMargin="-80px">
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://calendar.notion.so/meet/jason-jeong/coffee-chat"
              target="_blank"
              rel="noopener noreferrer"
              className={`${ctaBase} bg-foreground text-background hover:bg-foreground/90`}
            >
              Coffee Chat
            </a>
            <a
              href="mailto:jhjeong00@gmail.com"
              className={`${ctaBase} border border-border text-foreground hover:border-foreground/25`}
            >
              Email
            </a>
            <Link
              href="/resume"
              className={`${ctaBase} border border-border text-foreground hover:border-foreground/25`}
            >
              Resume
            </Link>
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
```

**Step 2: Verify build**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No errors

**Step 3: Commit**

```bash
git add src/container/about/components/ContactSection.tsx
git commit -m "feat: contact section with expanding line and dramatic whitespace"
```

---

### Task 6: Full Build Verification

**Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Next.js build**

Run: `npx next build 2>&1 | tail -20`
Expected: Compiled successfully (existing /2025 and /api/og errors are pre-existing and unrelated)

**Step 3: Final commit with all changes**

If any files were missed or needed adjustment, stage and commit them here.
