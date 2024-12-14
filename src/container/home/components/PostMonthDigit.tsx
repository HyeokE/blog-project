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

  return (
    <NumberDigit
      data={months}
      current={getMonth(currentDate) + 1}
      duration={0.5}
      formatter={(year) => <>{year}월</>}
    />
  );
};

export default PostMonthDigit;
