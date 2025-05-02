import React from 'react';

interface FadeBlurProps {
  children: React.ReactNode;
}

const PostFadeBlur = ({ children }: FadeBlurProps) => {
  return (
    <div className="absolute inset-0 snap-y snap-mandatory overflow-y-scroll scroll-smooth [mask-image:linear-gradient(to_bottom,transparent_5%,#fefbf6_45%,#fefbf6_65%,transparent_95%)]">
      {children}
    </div>
  );
};

export default PostFadeBlur;
