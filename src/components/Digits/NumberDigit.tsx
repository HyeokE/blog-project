import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

interface NumberDigitProps {
  current: number;
  data: number[];
  height?: number;
  duration: number;
  formatter?: (year: number) => React.ReactNode;
}

export const NumberDigit = ({ current, data, height, duration, formatter }: NumberDigitProps) => {
  const [offset, setOffset] = useState(0);
  const [displayNumbers, setDisplayNumbers] = useState<number[]>([]);

  useEffect(() => {
    const currentIndex = data.indexOf(current);

    setDisplayNumbers(data);
    setOffset(-currentIndex * 82);
  }, [current, data, height]);

  return (
    <div className="h-[82px] w-fit overflow-visible">
      <motion.div
        className="flex flex-col items-center justify-center w-fit transition-transform duration-500 ease-out"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {displayNumbers.map((year) => (
          <motion.div
            key={year}
            layoutId={year.toString()}
            className="flex items-center justify-center h-[82px] w-fit text-xl font-light text-gray-700"
          >
            {formatter ? formatter(year) : year}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};
