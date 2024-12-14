import { motion } from 'motion/react';
import React, { useEffect, useState } from 'react';

interface YearProps {
  currentYear: number;
  availableYears: number[];
  height?: number;
  duration: number;
  formatter?: (year: number) => React.ReactNode;
}

export const NumberDigit = ({
  currentYear,
  availableYears,
  height,
  duration,
  formatter,
}: YearProps) => {
  const [offset, setOffset] = useState(0);
  const [displayYears, setDisplayYears] = useState<number[]>([]);

  useEffect(() => {
    const currentIndex = availableYears.indexOf(currentYear);

    setDisplayYears(availableYears);
    setOffset(-currentIndex * 82);
  }, [currentYear, availableYears, height]);

  return (
    <div className="h-[82px] w-fit overflow-visible">
      <motion.div
        className="flex flex-col items-center justify-center w-fit transition-transform duration-500 ease-out"
        style={{ transform: `translateY(${offset}px)` }}
      >
        {displayYears.map((year) => (
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
