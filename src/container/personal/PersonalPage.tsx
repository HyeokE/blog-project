import React from 'react';
import { getAllPosts } from '@/apis/NotionService';
import { CloudLayout } from '@/container/cloud-home/components/CloudLayout';
import { HeroSection } from '@/container/cloud-home/components/HeroSection';
import { BlogList } from '@/container/cloud-home/components/BlogList';

const PersonalPage = async () => {
  const posts = await getAllPosts({ includePages: false });
  const personalPosts = posts.filter((post) =>
    post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
  );

  return (
    <CloudLayout>
      <HeroSection />
      <section className="snap-center px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif-home mb-16 text-center text-3xl text-[#4a4a4a]/80 italic">
            Latest Writings
          </h2>
          <BlogList posts={personalPosts} />
        </div>
      </section>
    </CloudLayout>
  );
};

export default PersonalPage;
