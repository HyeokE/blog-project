import { getAllPosts } from '@/apis/NotionService';
import { CloudLayout } from './components/CloudLayout';
import { HeroSection } from './components/HeroSection';
import { BlogList } from './components/BlogList';

const CloudHomePage = async () => {
  const posts = await getAllPosts({ includePages: false });
  const filteredPosts = posts.filter(
    (post) => !post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
  );

  return (
    <CloudLayout>
      <HeroSection />
      <section className="snap-center px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif-home mb-16 text-center text-2xl text-[#4a4a4a]/80 italic">
            Latest Writings
          </h2>
          <BlogList posts={filteredPosts.slice(0, 8)} />
        </div>
      </section>
    </CloudLayout>
  );
};

export default CloudHomePage;
