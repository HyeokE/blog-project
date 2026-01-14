'use client';

import { useEffect, useRef } from 'react';
import { useDarkMode } from '@/context/DarkModeContext';

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
    let animationId: number;
    const clouds: Cloud[] = [];
    const CLOUD_COUNT = 15;

    // Colors are fixed by design spec:
    // White clouds on Cloud Dancer (#f0efec) sky

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

            // 다크모드에 따른 구름 색상 변경 - 클라우드 댄서 따뜻한 톤 유지
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
      ctx.clearRect(0, 0, width, height);

      const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
      // 다크모드에 따른 배경색 변경 - 클라우드 댄서 따뜻한 톤 유지
      const skyColor = mode === 'dark' ? 'rgb(26, 25, 24)' : 'rgb(240, 239, 236)';
      skyGradient.addColorStop(0, skyColor);
      skyGradient.addColorStop(1, skyColor);

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
  }, [mode]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-full w-full bg-cloud-dancer">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-cloud-dancer/10" />
    </div>
  );
};
