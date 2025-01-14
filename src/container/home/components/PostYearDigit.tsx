'use client';
import { NumberDigit } from '@/components/Digits/NumberDigit';
import React, { useEffect, useState } from 'react';
import { useSnapCenter } from '@/hooks/useCurrentPost';

import { getYear } from 'date-fns';
import { uniqBy } from 'es-toolkit';

// const pastYears = new Array(10).fill(0).map((_, i) => new Date().getFullYear() - i - 1);
// const futureYears = new Array(10).fill(0).map((_, i) => new Date().getFullYear() + i);
// const years = [...pastYears, ...futureYears].sort((a, b) => a - b);

const PostYearDigit = () => {
  const [postYears, setPostYears] = useState<number[]>([]);
  const currentDate = useSnapCenter<Date>(
    '.post-list',
    (element) => new Date(element.getAttribute('data-post-date') as string),
    new Date(),
  );

  useEffect(() => {
    const elements = document.querySelectorAll('.post-list');
    const postYears = uniqBy(
      Array.from(elements).map((element) => {
        const date = new Date(element.getAttribute('data-post-date') as string);
        return getYear(date);
      }),
      (num) => num,
    );
    setPostYears(postYears);
  }, []);

  return (
    <NumberDigit
      data={postYears}
      current={getYear(currentDate)}
      duration={0.5}
      formatter={(year) => (
        <span className="whitespace-nowrap text-xl text-gray-700 dark:text-gray-500">
          {year}
          <span className="text-xl text-gray-700 max-[600px]:hidden dark:text-gray-500">년</span>
        </span>
      )}
    />
  );
};

export default PostYearDigit;
