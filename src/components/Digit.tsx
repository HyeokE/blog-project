'use client';
import React, { type ReactNode, useEffect, useRef, useState } from 'react';

import { twMerge } from 'tailwind-merge';
import usePreviousState from '@/hooks/usePreviousState';
import { useWindowSize } from '@/hooks/useWindowSize';
import { motion } from 'motion/react';

const _getArr = (a: number, b: number) => new Array(b - a + 1).fill(0).map((_, index) => a + index);
export const getArr = (x: number, y: number) => {
  const a = Math.floor(x);
  const b = Math.floor(y);

  if (a === b) {
    return [a];
  }
  if (a < b) {
    return _getArr(a, b);
  }
  if (a >= b) {
    return [..._getArr(a, 9), ..._getArr(0, b)];
  }

  return [];
};

let rendered = false;
let isAnimating = false;

interface Props {
  digit: string;
  width?: number;
  height: number;
  duration: number;
  formatter?: (digit: string) => ReactNode;
}

const Digit = ({ digit, width, height, duration, formatter }: Props) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const prevDigitState = usePreviousState(digit);
  const prevDigit = rendered ? prevDigitState : digit === '0' ? '1' : '0';
  const [numbers, setNumbers] = useState<string[]>([]);

  useEffect(() => {
    rendered = true;
    isAnimating = true;
    setOffset(-digit * height);

    return () => {
      rendered = false;
      setOffset(0);
      isAnimating = false;
    };
  }, []);

  useEffect(() => {
    const diff = Number(digit) - Number(prevDigit);
    const offset = diff > 0 ? -diff * height : -(diff + 10) * height;

    setOffset(offset);
    isAnimating = true;
  }, [digit, height]);

  useEffect(() => {
    setNumbers(getArr(Number(prevDigit), Number(digit)).map(String));
  }, [digit]);

  useEffect(() => {
    wrapperRef.current?.addEventListener('transitionend', () => {
      rendered = false;
      isAnimating = false;
      setNumbers((prev) => [digit, ...prev]);
      setOffset(0);
    });
  }, [digit]);

  const wrapperStyle = {
    marginTop: `${offset}px`,
    transition: isAnimating ? `margin-top ${duration}s cubic-bezier(0.08, 0.9, 0.64, 0.99)` : '',
  };

  const digitStyle = {
    height: `${height}px`,
    width: width ? `${width}px` : 'auto',
  };

  return (
    <div ref={wrapperRef} className="flex flex-col box-border" style={wrapperStyle}>
      {numbers.map((d, index) => (
        <div
          key={index}
          className="flex flex-none justify-center items-center box-border"
          style={digitStyle}
        >
          {formatter?.(d) ?? d}
        </div>
      ))}
    </div>
  );
};

interface YearProps {
  currentYear: number;
  availableYears: number[];
  height?: number;
  duration: number;
}

export const YearDigit = ({ currentYear, availableYears, height, duration }: YearProps) => {
  const [offset, setOffset] = useState(0);
  const [displayYears, setDisplayYears] = useState<number[]>([]);

  useEffect(() => {
    const currentIndex = availableYears.indexOf(currentYear);

    const yearsToShow = availableYears.slice(currentIndex - 10, currentIndex + 10);
    const slicedIndex = yearsToShow.indexOf(currentYear);

    setDisplayYears(yearsToShow);
    setOffset(-slicedIndex * 82);
  }, [currentYear, availableYears, height]);

  return (
    <div className="h-[82px] w-fit overflow-visible">
      <motion.div
        className="flex flex-col w-fit transition-transform duration-500 ease-out"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {displayYears.map((year) => (
          <motion.div
            key={year}
            layoutId={year.toString()}
            className="flex items-center justify-center h-[82px] w-fit text-5xl font-bold"
          >
            {year}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default Digit;
