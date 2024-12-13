'use client';
import { YearDigit } from '@/components/Digits/YearDigit';
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
    <YearDigit availableYears={months} currentYear={getMonth(currentDate) + 1} duration={0.5} />
  );
};

export default PostMonthDigit;
