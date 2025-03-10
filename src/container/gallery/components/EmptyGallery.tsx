import React from 'react';

/**
 * 이미지가 없을 때 표시하는 컴포넌트
 */
const EmptyGallery = () => {
  return (
    <div className="my-10 w-full rounded-lg bg-gray-50 p-8 text-center text-gray-600">
      <p className="text-xl">이미지가 없습니다</p>
      <p className="mt-2">public/images 폴더에 이미지를 추가해주세요</p>
    </div>
  );
};

export default EmptyGallery;
