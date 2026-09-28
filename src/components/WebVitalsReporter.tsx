'use client';

import { useReportWebVitals } from 'next/web-vitals';
import { reportWebVital } from '@/utils/webVitals';

export default function WebVitalsReporter() {
  useReportWebVitals(reportWebVital);
  return null;
}
