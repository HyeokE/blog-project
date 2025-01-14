'use client';
import { NumberDigit } from '@/components/Digits/NumberDigit';
import React from 'react';
import { useSnapCenter } from '@/hooks/useCurrentPost';

import { getMonth } from 'date-fns';

const months = new Array(12).fill(0).map((_, i) => i + 1);

const PostMonthDigit = () => {
  const currentDate = useSnapCenter<Date>(
    '.post-list',
    (element) => new Date(element.getAttribute('data-post-date') as string),
    new Date(),
  );
  const initialOffset = -getMonth(currentDate) * 82; // Calculate initial offset

  return (
    <NumberDigit
      data={months}
      current={getMonth(currentDate) + 1}
      duration={0.5}
      initialOffset={initialOffset}
      formatter={(year) => (
        <span className="whitespace-nowrap text-xl text-gray-700 dark:text-gray-500">
          {year}
          <span className="text-xl text-gray-700 max-[600px]:hidden dark:text-gray-500">월</span>
        </span>
      )}
    />
  );
};

export default PostMonthDigit;
