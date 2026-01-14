import React from 'react';

/**
 * 갤러리 이미지 로딩 상태 컴포넌트
 */
const LoadingState = () => {
  return (
    <div className="flex w-full items-center justify-center py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-300 border-t-brand-600 dark:border-brand-700 dark:border-t-brand-400"></div>
    </div>
  );
};

export default LoadingState;
