import { getAllPosts } from '@/apis/NotionService';
import HomeLayout from '@/container/home/components/HomeLayout';

const HomePage2025 = async () => {
  const posts = await getAllPosts({ includePages: false });
  const filteredPosts = posts.filter(
    (post) => !post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
  );

  return <HomeLayout posts={filteredPosts} />;
};

export default HomePage2025;
