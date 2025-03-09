import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

interface NumberDigitProps {
  current: number;
  data: number[];
  height?: number;
  duration: number;
  initialOffset?: number; // Add this new prop

  formatter?: (year: number) => React.ReactNode;
}

export const NumberDigit = ({
  current,
  data,
  height,
  initialOffset,
  formatter,
}: NumberDigitProps) => {
  const [offset, setOffset] = useState(initialOffset);
  const [displayNumbers, setDisplayNumbers] = useState<number[]>([]);

  useEffect(() => {
    const currentIndex = data.indexOf(current);

    setDisplayNumbers(data);
    setOffset(-currentIndex * 82);
  }, [current, data, height]);

  return (
    <div className="h-[82px] w-fit overflow-visible">
      <motion.div
        className="flex w-fit flex-col items-center justify-center transition-transform duration-500 ease-out"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {displayNumbers.map((year) => (
          <motion.div
            key={year}
            layoutId={year.toString()}
            className="flex h-[82px] w-fit items-center justify-center text-xl font-light text-gray-700"
          >
            {formatter ? formatter(year) : year}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
