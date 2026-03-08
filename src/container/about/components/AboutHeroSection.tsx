'use client';

import Link from 'next/link';
import { motion, useTransform } from 'motion/react';
import { useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';
import type { AboutProfile } from '../data';
import { useSectionScroll } from './useSectionScroll';

interface AboutHeroSectionProps {
  profile: AboutProfile;
}

const ctaBase =
  'inline-flex items-center rounded-full px-5 py-2.5 text-xs tracking-[0.18em] uppercase transition-all duration-200 hover:-translate-y-0.5';

/** Full-screen canvas clouds — same rendering as AirplaneWindow */
function SkyCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mode } = useDarkMode();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let width = 0;
    let height = 0;
    let animationId = 0;

    interface Puff {
      x: number;
      y: number;
      radius: number;
      alpha: number;
    }

    interface Cloud {
      x: number;
      y: number;
      speed: number;
      scale: number;
      puffs: Puff[];
      update: () => void;
      draw: (ctx: CanvasRenderingContext2D) => void;
    }

    const clouds: Cloud[] = [];
    const CLOUD_COUNT = 12;

    const createCloud = (): Cloud => {
      const scale = 0.5 + Math.random() * 0.7;
      const puffCount = 10 + Math.floor(Math.random() * 8);
      const horizontalSpread = Math.max(120, width * 0.4);
      const verticalSpread = Math.max(50, height * 0.18);
      const baseRadius = Math.max(20, Math.min(width, height) * 0.06);
      const puffs: Puff[] = [];

      for (let i = 0; i < puffCount; i++) {
        puffs.push({
          x: (Math.random() - 0.5) * horizontalSpread * scale,
          y: (Math.random() - 0.5) * verticalSpread * scale,
          radius: (baseRadius + Math.random() * baseRadius * 1.2) * scale,
          alpha: 0.15 + Math.random() * 0.2,
        });
      }

      const cloud: Cloud = {
        x: Math.random() * width,
        y: Math.random() * (height * 0.5) + height * 0.1,
        speed: 0.04 + Math.random() * 0.06,
        scale,
        puffs,
        update() {
          this.x += this.speed;
          if (this.x - horizontalSpread > width) {
            this.x = -horizontalSpread * 0.7;
            this.y = Math.random() * (height * 0.5) + height * 0.1;
          }
        },
        draw(drawCtx: CanvasRenderingContext2D) {
          drawCtx.save();
          drawCtx.translate(this.x, this.y);

          for (const puff of this.puffs) {
            const gradient = drawCtx.createRadialGradient(
              puff.x,
              puff.y,
              0,
              puff.x,
              puff.y,
              puff.radius,
            );

            const cloudColor = mode === 'dark' ? '45, 43, 41' : '255, 255, 255';
            gradient.addColorStop(0, `rgba(${cloudColor}, ${puff.alpha})`);
            gradient.addColorStop(0.5, `rgba(${cloudColor}, ${puff.alpha * 0.5})`);
            gradient.addColorStop(1, `rgba(${cloudColor}, 0)`);

            drawCtx.fillStyle = gradient;
            drawCtx.beginPath();
            drawCtx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
            drawCtx.fill();
          }

          drawCtx.restore();
        },
      };

      return cloud;
    };

    const init = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;

      if (!width || !height) {
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;

      clouds.length = 0;
      for (let i = 0; i < CLOUD_COUNT; i++) {
        clouds.push(createCloud());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      clouds.forEach((cloud) => {
        cloud.update();
        cloud.draw(ctx);
      });

      const hazeColor = mode === 'dark' ? '52, 48, 44' : '240, 239, 236';
      const horizonHaze = ctx.createLinearGradient(0, height * 0.5, 0, height);
      horizonHaze.addColorStop(0, `rgba(${hazeColor}, 0)`);
      horizonHaze.addColorStop(0.4, `rgba(${hazeColor}, 0.2)`);
      horizonHaze.addColorStop(1, `rgba(${hazeColor}, 0.85)`);

      ctx.fillStyle = horizonHaze;
      ctx.fillRect(0, height * 0.45, width, height * 0.55);

      animationId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      init();
    });

    resizeObserver.observe(canvas);
    init();
    animate();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
    };
  }, [mode]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />;
}

export function AboutHeroSection({ profile }: AboutHeroSectionProps) {
  const { ref, scrollYProgress } = useSectionScroll<HTMLElement>();
  const no = useReducedMotion() ?? false;

  const fadeOut = useTransform(scrollYProgress, [0.5, 0.68], [1, 0]);
  const headlineY = useTransform(scrollYProgress, [0.33, 0.68], [0, no ? 0 : -140]);
  const infoY = useTransform(scrollYProgress, [0.33, 0.68], [0, no ? 0 : -50]);

  return (
    <section ref={ref} className="relative min-h-[200vh]">
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* Open sky gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#bcc4d1] via-[#d0c8cb] via-[45%] to-[#e8ddd0] dark:from-[#2a2826] dark:via-[#252321] dark:to-[#1e1c1a]" />

        {/* Living canvas clouds */}
        <SkyCanvas />

        {/* Sun glow */}
        <motion.div
          animate={{ opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute -right-20 top-[20%] h-[300px] w-[300px] rounded-full blur-[100px] md:h-[500px] md:w-[500px]"
          style={{
            background:
              'radial-gradient(circle, rgba(248,222,186,0.5) 0%, rgba(242,212,178,0.2) 50%, transparent 70%)',
          }}
        />

        {/* Fade to page background at bottom */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[25%] bg-gradient-to-t from-background to-transparent" />

        {/* Giant headline */}
        <motion.div
          style={{ y: headlineY, opacity: fadeOut }}
          className="absolute inset-0 z-10 flex items-center justify-center px-6"
        >
          <h1 className="max-w-5xl text-center text-[clamp(2.8rem,8vw,7rem)] leading-[1.0] font-bold tracking-tight text-white/60 dark:text-white/[0.07]">
            {profile.heroHeadline}
          </h1>
        </motion.div>

        {/* Info overlay — bottom left */}
        <motion.div
          style={{ y: infoY, opacity: fadeOut }}
          className="absolute bottom-12 left-6 z-30 md:bottom-16 md:left-10"
        >
          <p className="text-[11px] tracking-[0.2em] text-foreground/40 uppercase">
            {profile.name} · {profile.role}
          </p>
          <p className="mt-3 max-w-md text-sm leading-[1.7] text-foreground/50 md:text-base md:leading-[1.7]">
            {profile.heroSummary}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Link
              href="/resume"
              className={`${ctaBase} bg-foreground/80 text-background hover:bg-foreground`}
            >
              Resume
            </Link>
            <a
              href="https://github.com/HyeokE"
              target="_blank"
              rel="noopener noreferrer"
              className={`${ctaBase} border border-foreground/15 text-foreground/60 hover:border-foreground/30 hover:text-foreground`}
            >
              GitHub
            </a>
            <a
              href="mailto:jhjeong00@gmail.com"
              className={`${ctaBase} border border-foreground/15 text-foreground/60 hover:border-foreground/30 hover:text-foreground`}
            >
              Email
            </a>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          style={{ opacity: fadeOut }}
          className="absolute bottom-6 left-1/2 z-30 -translate-x-1/2"
        >
          <div className="h-8 w-px bg-gradient-to-b from-foreground/20 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
