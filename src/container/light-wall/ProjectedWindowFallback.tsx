'use client';

import { useEffect, useId, useRef } from 'react';
import type { MotionValue } from 'motion/react';
import './projected-window.css';

import { projectWindowPoint, windowProjectionTransform } from './window-projection';
export { WINDOW_DAWN, projectWindowPoint } from './window-projection';

const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

const rectangles = [
  [0.22, 0.12, 0.65, 0.58],
  [0.71, 0.12, 0.98, 0.58],
  [0.22, 0.64, 0.65, 2],
  [0.71, 0.64, 0.98, 2],
] as const;

function polygon(rectangle: readonly number[], progress: number) {
  const [left, bottom, right, top] = rectangle;
  return [
    [left, bottom],
    [right, bottom],
    [right, top],
    [left, top],
  ]
    .map(([x, y]) => {
      const [screenX, screenY] = projectWindowPoint(x, y, progress);
      return `${(screenX * 1000).toFixed(3)},${((1 - screenY) * 1000).toFixed(3)}`;
    })
    .join(' ');
}

function color(values: number[]) {
  return `rgb(${values.map((value) => Math.round(Math.max(0, Math.min(1, value)) * 255)).join(' ')})`;
}

function palette(progress: number) {
  const brightness = mix(0.68, 1, progress);
  const plaster = [0.77, 0.765, 0.72];
  const sun = [0.17, 0.15, 0.1];
  const dawn = [0.045, 0.018, 0];
  return {
    wall: color(plaster.map((channel) => channel * brightness)),
    frame: color(
      plaster.map(
        (channel, index) =>
          (channel + sun[index] * 0.18) * brightness + dawn[index] * (1 - progress),
      ),
    ),
    pane: color(
      plaster.map(
        (channel, index) => (channel + sun[index]) * brightness + dawn[index] * (1 - progress),
      ),
    ),
    night: color([0.13, 0.13, 0.115].map((channel) => channel * 0.79 * mix(0.48, 1, progress))),
  };
}

function WindowPanes({ endpoint, id }: { endpoint: 0 | 1; id: string }) {
  const colors = palette(endpoint);
  return (
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="projected-window-fallback__panes">
      <defs>
        <filter id={id} x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <g filter={`url(#${id})`}>
        <polygon points={polygon([0.22, 0.12, 0.98, 2], endpoint)} fill={colors.frame} />
        {rectangles.map((rectangle, index) => (
          <polygon key={index} points={polygon(rectangle, endpoint)} fill={colors.pane} />
        ))}
      </g>
    </svg>
  );
}

/** Static SVG textures: animation only changes their enclosing HTML transform and opacity. */
export default function ProjectedWindowFallback({
  progress,
  mode,
}: {
  progress?: MotionValue<number>;
  mode: 'light' | 'dark';
}) {
  const id = useId().replaceAll(':', '');
  const rootRef = useRef<HTMLDivElement>(null);
  const dawnRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef<HTMLDivElement>(null);
  const dawnWallRef = useRef<HTMLDivElement>(null);
  const dawnNightRef = useRef<HTMLDivElement>(null);
  const animated = Boolean(progress);
  const dawn = palette(0);
  const settled = palette(1);

  useEffect(() => {
    const root = rootRef.current;
    if (!progress || !root) {
      return;
    }
    let width = root.clientWidth;
    let height = root.clientHeight;
    const update = (value: number) => {
      const p = Math.max(0, Math.min(1, value));
      const opacity = String(1 - p);
      if (dawnNightRef.current) {
        dawnNightRef.current.style.opacity = opacity;
      }
      if (document.documentElement.dataset.mode === 'dark' || !width || !height) {
        return;
      }
      if (dawnWallRef.current) {
        dawnWallRef.current.style.opacity = opacity;
      }
      if (dawnRef.current) {
        dawnRef.current.style.transform = windowProjectionTransform(p, 0, width, height);
      }
      if (settledRef.current) {
        settledRef.current.style.transform = windowProjectionTransform(p, 1, width, height);
        settledRef.current.style.visibility = 'visible';
      }
    };
    update(progress.get());
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      update(progress.get());
    });
    resize.observe(root);
    const modeObserver = new MutationObserver(() => update(progress.get()));
    modeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    const unsubscribe = progress.on('change', update);
    return () => {
      resize.disconnect();
      modeObserver.disconnect();
      unsubscribe();
    };
  }, [progress]);

  return (
    <div ref={rootRef} className="projected-window-fallback" data-mode={mode} data-animated={animated || undefined} aria-hidden="true">
      <div className="projected-window-fallback__day" style={{ backgroundColor: settled.wall }}>
        <div ref={settledRef} className="projected-window-fallback__plane" style={{ visibility: animated ? 'hidden' : 'visible' }}>
          <WindowPanes endpoint={1} id={`${id}-settled`} />
        </div>
        {animated && (
          // Fade the opaque dawn scene as one layer so settled light cannot
          // shine through its translucent blur and create a bright outline.
          <div ref={dawnWallRef} className="projected-window-fallback__surface" style={{ backgroundColor: dawn.wall }}>
            <div ref={dawnRef} className="projected-window-fallback__plane">
              <WindowPanes endpoint={0} id={`${id}-dawn`} />
            </div>
          </div>
        )}
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="projected-window-fallback__surface">
          <defs>
            <radialGradient id={`${id}-ambient`} cx="105%" cy="4%" r="100%">
              <stop stopColor="#fff9e3" stopOpacity="0.035" />
              <stop offset="1" stopColor="#fff9e3" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1000" height="1000" fill={`url(#${id}-ambient)`} />
        </svg>
      </div>
      <div className="projected-window-fallback__night" style={{ backgroundColor: settled.night }}>
        {animated && <div ref={dawnNightRef} className="projected-window-fallback__surface" style={{ backgroundColor: dawn.night }} />}
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="projected-window-fallback__surface">
          <defs>
            <radialGradient id={`${id}-lamp`} cx="105%" cy="4%" r="100%">
              <stop stopColor="#918058" stopOpacity="0.55" />
              <stop offset="1" stopColor="#918058" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="1000" height="1000" fill={`url(#${id}-lamp)`} />
        </svg>
      </div>
    </div>
  );
}
