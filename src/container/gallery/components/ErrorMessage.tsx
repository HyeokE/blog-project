import { ANALYTICS_ELEMENTS, ANALYTICS_SECTIONS } from '@/constants/analytics';
import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}

/**
 * 갤러리 에러 메시지 컴포넌트
 */
const ErrorMessage = ({ message, onRetry }: ErrorMessageProps) => {
  return (
    <div className="my-10 w-full rounded-lg bg-red-50 p-4 text-center text-red-600 dark:bg-red-950 dark:text-red-400">
      <p>{message}</p>
      <button
        data-analytics-label={ANALYTICS_ELEMENTS.GALLERY_RETRY}
        data-analytics-section={ANALYTICS_SECTIONS.GALLERY}
        onClick={onRetry}
        className="mt-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
      >
        다시 시도
      </button>
    </div>
  );
};

export default ErrorMessage;
