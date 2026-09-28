import { getAllPosts } from '@/apis/NotionService';
import LightWall from '../LightWall';

export default async function PersonalPage() {
  const posts = await getAllPosts({ includePages: false });
  const personalPosts = posts.filter((post) =>
    post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
  );
  return <LightWall posts={personalPosts} />;
}
