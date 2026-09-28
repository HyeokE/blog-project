import { getAllPosts } from '@/apis/NotionService';
import LightWall from '../LightWall';

export default async function HomePage() {
  const posts = await getAllPosts({ includePages: false });
  return (
    <LightWall
      posts={posts.filter(
        (post) => !post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
      )}
    />
  );
}
