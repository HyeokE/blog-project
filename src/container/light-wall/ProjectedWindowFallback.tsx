'use client';

import { useEffect, useId, useRef } from 'react';
import type { MotionValue } from 'motion/react';
import './projected-window.css';

/** Shared by the SVG inverse projection and the WebGL forward projection. */
export const WINDOW_DAWN = {
  sourceX: 1.05,
  sourceY: 1.02,
  compressionX: 1.12,
  compressionY: 0.88,
  shear: 0.3,
  tilt: 0.08,
  drop: -0.12,
  perspectiveX: 0.12,
  perspectiveY: 0.1,
} as const;

const mix = (start: number, end: number, progress: number) => start + (end - start) * progress;

/** Inverse of WallLighting's windowUv mapping, in normalized bottom-left screen coordinates. */
export function projectWindowPoint(x: number, y: number, progress: number): [number, number] {
  const p = Math.max(0, Math.min(1, progress));
  const shear = mix(WINDOW_DAWN.shear, 0.55, p);
  const tilt = mix(WINDOW_DAWN.tilt, 0.16, p);
  const shiftedX = x - shear * 0.5;
  const shiftedY = y - mix(WINDOW_DAWN.drop, 0, p);
  const determinant = 1 + shear * tilt;
  const projectedX = (shiftedX + shear * shiftedY) / determinant;
  const projectedY = (shiftedY - tilt * shiftedX) / determinant;
  if (p === 1) {
    return [projectedX, projectedY];
  }
  const rayX = (projectedX - WINDOW_DAWN.sourceX) / mix(WINDOW_DAWN.compressionX, 1, p);
  const rayY = (projectedY - WINDOW_DAWN.sourceY) / mix(WINDOW_DAWN.compressionY, 1, p);
  const denominator =
    1 - (1 - p) * (WINDOW_DAWN.perspectiveX * rayX + WINDOW_DAWN.perspectiveY * rayY);
  return [WINDOW_DAWN.sourceX + rayX / denominator, WINDOW_DAWN.sourceY + rayY / denominator];
}

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

/** Real SSR geometry, then an imperative update of the same four panes used by the shader. */
export default function ProjectedWindowFallback({
  progress,
  mode,
}: {
  progress?: MotionValue<number>;
  mode: 'light' | 'dark';
}) {
  const id = useId().replaceAll(':', '');
  const panesRef = useRef<Array<SVGPolygonElement | null>>([]);
  const frameRef = useRef<SVGPolygonElement>(null);
  const wallRef = useRef<SVGRectElement>(null);
  const nightRef = useRef<SVGRectElement>(null);
  const initialProgress = progress ? 0 : 1;
  const initial = palette(initialProgress);

  useEffect(() => {
    if (!progress) {
      return;
    }
    const update = (value: number) => {
      const p = Math.max(0, Math.min(1, value));
      const colors = palette(p);
      panesRef.current.forEach((pane, index) => {
        pane?.setAttribute('points', polygon(rectangles[index], p));
        pane?.setAttribute('fill', colors.pane);
      });
      frameRef.current?.setAttribute('points', polygon([0.22, 0.12, 0.98, 2], p));
      frameRef.current?.setAttribute('fill', colors.frame);
      wallRef.current?.setAttribute('fill', colors.wall);
      nightRef.current?.setAttribute('fill', colors.night);
    };
    update(progress.get());
    return progress.on('change', update);
  }, [progress]);

  return (
    <svg
      className="projected-window-fallback"
      data-mode={mode}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <defs>
        <filter
          id={`${id}-soft`}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <radialGradient id={`${id}-ambient`} cx="105%" cy="4%" r="100%">
          <stop stopColor="#fff9e3" stopOpacity="0.035" />
          <stop offset="1" stopColor="#fff9e3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-lamp`} cx="105%" cy="4%" r="100%">
          <stop stopColor="#918058" stopOpacity="0.55" />
          <stop offset="1" stopColor="#918058" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g className="projected-window-fallback__day">
        <rect ref={wallRef} width="1000" height="1000" fill={initial.wall} />
        <g filter={`url(#${id}-soft)`}>
          <polygon
            ref={frameRef}
            points={polygon([0.22, 0.12, 0.98, 2], initialProgress)}
            fill={initial.frame}
          />
          {rectangles.map((rectangle, index) => (
            <polygon
              key={index}
              ref={(node) => {
                panesRef.current[index] = node;
              }}
              points={polygon(rectangle, initialProgress)}
              fill={initial.pane}
            />
          ))}
        </g>
        <rect width="1000" height="1000" fill={`url(#${id}-ambient)`} />
      </g>
      <g className="projected-window-fallback__night" visibility="hidden">
        <rect ref={nightRef} width="1000" height="1000" fill={initial.night} />
        <rect width="1000" height="1000" fill={`url(#${id}-lamp)`} />
      </g>
    </svg>
  );
}
