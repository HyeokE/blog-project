'use client';

import { motion } from 'motion/react';

interface AirplaneWindowProps {
  size: 'hero' | 'about';
}

const sizeConfig = {
  hero: {
    outerRadius: 'rounded-[90px]',
    innerRadius: 'rounded-[85px]',
    glassRadius: 'rounded-[80px]',
    glass: 'h-[340px] w-[230px] sm:h-[400px] sm:w-[270px] md:h-[460px] md:w-[310px]',
    padding: 'p-2.5',
    innerPadding: 'p-[3px]',
    shadowRadius: 'rounded-[80px]',
    filterId: 'hero-cb',
    filterId2: 'hero-cb2',
  },
  about: {
    outerRadius: 'rounded-[70px]',
    innerRadius: 'rounded-[66px]',
    glassRadius: 'rounded-[62px]',
    glass: 'h-[260px] w-[180px]',
    padding: 'p-2',
    innerPadding: 'p-[3px]',
    shadowRadius: 'rounded-[62px]',
    filterId: 'about-cb',
    filterId2: 'about-cb2',
  },
} as const;

// Cloud SVG paths — organic shapes made of overlapping arcs
const cloudPaths = [
  // Fluffy wide cloud
  'M10,60 Q10,45 25,40 Q28,20 50,22 Q65,10 80,25 Q95,15 105,30 Q120,25 125,40 Q140,42 140,55 Q140,68 125,70 L15,70 Q10,70 10,60Z',
  // Compact puffy cloud
  'M5,50 Q5,38 18,35 Q22,18 42,22 Q55,12 68,25 Q80,20 85,32 Q98,30 100,45 Q100,58 88,60 L12,60 Q5,60 5,50Z',
  // Small wispy cloud
  'M8,40 Q8,30 20,28 Q25,16 40,20 Q52,12 60,22 Q70,18 75,28 Q85,26 85,38 Q85,48 72,50 L15,50 Q8,50 8,40Z',
];

function DriftingCloud({
  path,
  startX,
  endX,
  top,
  scale,
  duration,
  delay,
  opacity,
  filterId,
}: {
  path: string;
  startX: number;
  endX: number;
  top: string;
  scale: number;
  duration: number;
  delay: number;
  opacity: number;
  filterId: string;
}) {
  return (
    <motion.div
      animate={{
        x: [startX, endX],
        y: [0, -3, 2, 0],
        opacity: [0, opacity, opacity, opacity, 0],
      }}
      transition={{
        delay,
        duration,
        repeat: Infinity,
        ease: 'linear',
        y: { duration: duration * 0.3, repeat: Infinity, ease: 'easeInOut' },
      }}
      className="pointer-events-none absolute"
      style={{ top }}
    >
      <svg
        aria-hidden="true"
        width={150 * scale}
        height={80 * scale}
        viewBox="0 0 150 80"
        fill="none"
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        <path
          d={path}
          fill="white"
          fillOpacity="0.85"
          filter={`url(#${filterId})`}
        />
      </svg>
    </motion.div>
  );
}

export function AirplaneWindow({ size }: AirplaneWindowProps) {
  const c = sizeConfig[size];
  const prefix = size === 'hero' ? 'h' : 'a';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
      className="shrink-0"
    >
      <motion.div
        animate={{ y: [-3, 3, -3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Bezel */}
        <div
          className={`${c.outerRadius} bg-gradient-to-b from-[#d4d1cb] to-[#bfbcb6] ${c.padding} shadow-[0_10px_50px_rgba(0,0,0,0.1)] dark:from-[#3d3a36] dark:to-[#302e2b]`}
        >
          {/* Inner trim */}
          <div
            className={`${c.innerRadius} bg-[#dfdcd7] ${c.innerPadding} dark:bg-[#353230]`}
          >
            {/* Glass pane */}
            <div
              className={`relative overflow-hidden ${c.glassRadius} ${c.glass}`}
            >
              {/* Sky gradient — soft Cloud Dancer palette */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#c8cdd6] via-[#d8ced0] via-[40%] to-[#e8ddd0]" />

              {/* Sky color breathing overlay */}
              <motion.div
                animate={{ opacity: [0, 0.15, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 bg-gradient-to-b from-[#bfc5d1] to-[#ead5c4]"
              />

              {/* Sun glow */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.4, 0.6, 0.4],
                  x: [0, 3, -2, 0],
                  y: [0, -2, 1, 0],
                }}
                transition={{
                  delay: 1.8,
                  duration: 7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="absolute -right-6 bottom-[32%] h-[120px] w-[120px] rounded-full blur-3xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(248,222,186,0.8) 0%, rgba(242,212,178,0.35) 50%, transparent 70%)',
                }}
              />

              {/* Sun rays */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.08, 0.12, 0.08], rotate: [0, 6, 0] }}
                transition={{ delay: 2.2, duration: 20, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -right-[30%] -bottom-[10%] h-[200px] w-[200px]"
                style={{
                  background:
                    'conic-gradient(from 200deg, transparent 0deg, rgba(245,220,180,0.4) 8deg, transparent 16deg, rgba(245,220,180,0.3) 28deg, transparent 38deg, rgba(245,220,180,0.25) 50deg, transparent 62deg)',
                }}
              />

              {/* Window shade — slides up */}
              <motion.div
                initial={{ y: 0 }}
                animate={{ y: '-100%' }}
                transition={{ delay: 0.8, duration: 1.4, ease: [0.76, 0, 0.24, 1] }}
                className="absolute inset-0 z-20 bg-gradient-to-b from-[#d0cdc7] to-[#c4c1bb] dark:from-[#2f2d2a] dark:to-[#252321]"
              />

              {/* === Drifting SVG clouds === */}
              <DriftingCloud
                path={cloudPaths[0]}
                startX={-120}
                endX={350}
                top="12%"
                scale={0.9}
                duration={18}
                delay={2}
                opacity={0.7}
                filterId={`${prefix}-dc1`}
              />
              <DriftingCloud
                path={cloudPaths[1]}
                startX={300}
                endX={-150}
                top="28%"
                scale={0.7}
                duration={15}
                delay={3}
                opacity={0.6}
                filterId={`${prefix}-dc2`}
              />
              <DriftingCloud
                path={cloudPaths[2]}
                startX={-100}
                endX={320}
                top="20%"
                scale={0.5}
                duration={22}
                delay={4}
                opacity={0.45}
                filterId={`${prefix}-dc3`}
              />
              <DriftingCloud
                path={cloudPaths[0]}
                startX={250}
                endX={-130}
                top="38%"
                scale={0.6}
                duration={20}
                delay={2.5}
                opacity={0.55}
                filterId={`${prefix}-dc4`}
              />

              {/* === Cloud bank — multi-layer SVG sea of clouds === */}
              <div className="absolute right-[-20%] bottom-0 left-[-20%] h-[48%]">
                {/* Back layer */}
                <motion.svg
                  aria-hidden="true"
                  animate={{ x: [3, -3, 3] }}
                  transition={{ duration: 50, repeat: Infinity, ease: 'easeInOut' }}
                  viewBox="0 0 600 120"
                  preserveAspectRatio="none"
                  className="absolute top-0 right-0 left-0 h-12 w-full -translate-y-[25%] opacity-50 sm:h-14 md:h-16"
                >
                  <ellipse cx="100" cy="95" rx="70" ry="30" fill="#e4dfd8" />
                  <ellipse cx="280" cy="90" rx="60" ry="28" fill="#e8e2db" />
                  <ellipse cx="450" cy="92" rx="65" ry="30" fill="#e4dfd8" />
                </motion.svg>

                {/* Mid layer */}
                <motion.svg
                  aria-hidden="true"
                  animate={{ x: [6, -6, 6] }}
                  transition={{ duration: 38, repeat: Infinity, ease: 'easeInOut' }}
                  viewBox="0 0 600 120"
                  preserveAspectRatio="none"
                  className="absolute top-0 right-0 left-0 h-14 w-full -translate-y-[30%] opacity-70 sm:h-16 md:h-20"
                >
                  <defs>
                    <filter id={c.filterId2}>
                      <feGaussianBlur stdDeviation="2" />
                    </filter>
                  </defs>
                  <g filter={`url(#${c.filterId2})`}>
                    <ellipse cx="60" cy="88" rx="55" ry="28" fill="#ece9e4" />
                    <ellipse cx="190" cy="82" rx="65" ry="32" fill="#e8e2db" />
                    <ellipse cx="340" cy="86" rx="50" ry="26" fill="#ece9e4" />
                    <ellipse cx="500" cy="84" rx="60" ry="30" fill="#e8e2db" />
                  </g>
                </motion.svg>

                {/* Front layer — main cloud tops */}
                <motion.svg
                  aria-hidden="true"
                  animate={{ x: [-10, 10, -10] }}
                  transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
                  viewBox="0 0 600 120"
                  preserveAspectRatio="none"
                  className="absolute top-0 right-0 left-0 h-16 w-full -translate-y-[40%] sm:h-20 md:h-24"
                >
                  <defs>
                    <filter id={c.filterId}>
                      <feGaussianBlur stdDeviation="2.5" />
                    </filter>
                  </defs>
                  <g filter={`url(#${c.filterId})`}>
                    <ellipse cx="40" cy="85" rx="60" ry="32" fill="#f0efec" fillOpacity="0.95" />
                    <ellipse cx="140" cy="78" rx="70" ry="38" fill="#ede7e0" />
                    <ellipse cx="250" cy="83" rx="55" ry="30" fill="#f0efec" fillOpacity="0.92" />
                    <ellipse cx="350" cy="76" rx="65" ry="35" fill="#ece4dc" fillOpacity="0.95" />
                    <ellipse cx="460" cy="80" rx="58" ry="32" fill="#f0efec" />
                    <ellipse cx="560" cy="77" rx="62" ry="34" fill="#ede7e0" fillOpacity="0.95" />
                  </g>
                  <rect x="0" y="88" width="600" height="32" fill="#f0efec" />
                </motion.svg>

                {/* Solid cloud floor */}
                <div className="absolute inset-0 top-4 bg-[#f0efec]" />
              </div>

              {/* Glass reflection & depth */}
              <div className="pointer-events-none absolute inset-0 z-30 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent" />
              <div
                className={`pointer-events-none absolute inset-0 z-30 ${c.shadowRadius} shadow-[inset_0_2px_30px_rgba(0,0,0,0.04)]`}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
