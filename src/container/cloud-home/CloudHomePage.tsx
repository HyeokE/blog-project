import { getAllPosts } from '@/apis/NotionService';
import { CloudLayout } from './components/CloudLayout';
import { HeroSection } from './components/HeroSection';
import { BlogList } from './components/BlogList';

const CloudHomePage = async () => {
  const posts = await getAllPosts({ includePages: false });
  // personal 태그만 단독으로 있는 글은 제외 (다른 태그와 함께 있으면 포함)
  const filteredPosts = posts.filter((post) => {
    if (!post.tags || post.tags.length === 0) {
      return true;
    }
    if (post.tags.length === 1 && post.tags[0].toLowerCase().includes('personal')) {
      return false;
    }
    return true;
  });

  return (
    <CloudLayout>
      <HeroSection />
      <section className="snap-center px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-serif-home mb-16 text-center text-2xl text-muted-foreground italic">
            Latest Writings
          </h2>
          <BlogList posts={filteredPosts.slice(0, 8)} />
        </div>
      </section>
    </CloudLayout>
  );
};

export default CloudHomePage;
