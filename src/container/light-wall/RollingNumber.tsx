'use client';

import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';

function ReelDigit({ digit, position }: { digit: number; position: MotionValue<number> }) {
  const y = useTransform(position, (current) => {
    const offset = ((((digit - current) % 10) + 15) % 10) - 5;
    return `${offset * 100}%`;
  });
  return (
    <motion.span className="wall-reel-digit" style={{ y }}>
      {digit}
    </motion.span>
  );
}

function DigitReel({ value }: { value: number }) {
  const target = useRef(value);
  const reducedMotion = useReducedMotion();
  const position = useSpring(value, { stiffness: 95, damping: 21, mass: 0.8 });

  useEffect(() => {
    const previous = ((target.current % 10) + 10) % 10;
    let delta = value - previous;
    if (delta > 5) {
      delta -= 10;
    }
    if (delta < -5) {
      delta += 10;
    }
    target.current += delta;
    if (reducedMotion) {
      position.jump(target.current);
    } else {
      position.set(target.current);
    }
  }, [value, position, reducedMotion]);

  return (
    <span className="wall-digit-reel" aria-hidden="true">
      {Array.from({ length: 10 }, (_, digit) => (
        <ReelDigit key={digit} digit={digit} position={position} />
      ))}
    </span>
  );
}

export default function RollingNumber({ value, pad = 2 }: { value: number; pad?: number }) {
  const text = String(value).padStart(pad, '0');
  return (
    <span className="wall-rolling-number">
      <span className="wall-sr-only">{text}</span>
      {[...text].map((digit, index) => (
        <DigitReel key={text.length - index} value={Number(digit)} />
      ))}
    </span>
  );
}
