import React from 'react';

interface FadeBlurProps {
  children: React.ReactNode;
}

const PostFadeBlur = ({ children }: FadeBlurProps) => {
  return (
    <div
      className="absolute inset-0 overflow-y-scroll
     snap-y snap-mandatory scroll-smooth
      [mask-image:linear-gradient(to_bottom,transparent_5%,black_45%,black_65%,transparent_95%)]"
    >
      {children}
    </div>
  );
};

export default PostFadeBlur;
