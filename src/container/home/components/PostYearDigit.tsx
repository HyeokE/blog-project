'use client';
import React from 'react';
import { useSnapCenter } from '@/hooks/useCurrentPost';
import { YearDigit } from '@/components/Digit';
import { getYear } from 'date-fns';

const pastYears = new Array(20).fill(0).map((_, i) => new Date().getFullYear() - i);
const futureYears = new Array(20).fill(0).map((_, i) => new Date().getFullYear() + i);
const years = [...pastYears, ...futureYears];

const PostYearDigit = () => {
  const currentDate = useSnapCenter<Date>(
    '.post-list',
    (element) => new Date(element.getAttribute('data-post-date') as string),
    new Date(),
  );
  return (
    <YearDigit
      availableYears={years}
      currentYear={getYear(currentDate)}
      height={82}
      duration={0.5}
    />
  );
};

export default PostYearDigit;
