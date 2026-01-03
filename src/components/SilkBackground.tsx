'use client';

import { useEffect, useRef } from 'react';

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

export const SilkBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    let animationId: number;
    let time = 0;
    const clouds: Cloud[] = [];
    const CLOUD_COUNT = 15;

    const lerpColor = (
      r1: number,
      g1: number,
      b1: number,
      r2: number,
      g2: number,
      b2: number,
      t: number,
    ) => {
      const r = Math.round(r1 + (r2 - r1) * t);
      const g = Math.round(g1 + (g2 - g1) * t);
      const b = Math.round(b1 + (b2 - b1) * t);
      return `rgb(${r}, ${g}, ${b})`;
    };

    const createCloud = (): Cloud => {
      const scale = 0.5 + Math.random();
      const puffs: Puff[] = [];
      const puffCount = 10 + Math.floor(Math.random() * 12);

      for (let i = 0; i < puffCount; i++) {
        puffs.push({
          x: (Math.random() - 0.5) * 200 * scale,
          y: (Math.random() - 0.5) * 100 * scale,
          radius: (30 + Math.random() * 40) * scale,
          alpha: 0.2 + Math.random() * 0.3,
        });
      }

      const cloud: Cloud = {
        x: Math.random() * width,
        y: Math.random() * (height * 0.6),
        speed: 0.05 + Math.random() * 0.1,
        scale,
        puffs,
        update() {
          this.x += this.speed;
          if (this.x - 300 * this.scale > width) {
            this.x = -300 * this.scale;
            this.y = Math.random() * (height * 0.6);
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

            gradient.addColorStop(0, `rgba(255, 255, 255, ${puff.alpha})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${puff.alpha * 0.5})`);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

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
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;

      clouds.length = 0;
      for (let i = 0; i < CLOUD_COUNT; i++) {
        clouds.push(createCloud());
      }
    };

    const animate = () => {
      time += 0.002;
      const cycle = (Math.sin(time) + 1) / 2;

      ctx.clearRect(0, 0, width, height);

      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);

      const topColor = lerpColor(221, 238, 255, 216, 214, 208, cycle);
      const midColor = lerpColor(245, 249, 255, 230, 228, 223, cycle);
      const botColor = lerpColor(255, 255, 255, 240, 238, 233, cycle);

      skyGradient.addColorStop(0, topColor);
      skyGradient.addColorStop(0.6, midColor);
      skyGradient.addColorStop(1, botColor);

      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, width, height);

      clouds.forEach((cloud) => {
        cloud.update();
        cloud.draw(ctx);
      });

      animationId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', init);
    init();
    animate();

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-[#EAE8E4]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/10" />
    </div>
  );
};
