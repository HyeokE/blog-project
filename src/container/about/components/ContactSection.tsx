'use client';

import Link from 'next/link';
import { BlurFade } from '@/components/BlurFade';

const ctaBase =
  'inline-flex items-center rounded-full px-5 py-2.5 text-xs tracking-[0.18em] uppercase transition-all duration-300 hover:-translate-y-0.5';

export function ContactSection() {
  return (
    <section className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-4xl">
        <div className="h-px w-full bg-border/30" />

        <div className="pt-16 md:pt-20">
          <BlurFade delay={0} inView inViewMargin="-60px" duration={0.5}>
            <h2 className="font-serif-home text-4xl font-semibold text-foreground italic md:text-6xl">
              Let&apos;s Talk
            </h2>
            <p className="mt-3 max-w-md text-base leading-[1.75] text-muted-foreground">
              제품 경험, 디자인 시스템, 프론트엔드 구조에 대해 이야기하고 싶다면 편하게 연락 주세요.
            </p>
          </BlurFade>

          <BlurFade delay={0.1} inView inViewMargin="-60px" duration={0.5}>
            <div className="mt-8 flex flex-wrap gap-2.5">
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
      </div>
    </section>
  );
}
