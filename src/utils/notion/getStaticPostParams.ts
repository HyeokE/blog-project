import { getAllPosts } from '@/apis/NotionService';

export async function getStaticPostParams() {
  const posts = await getAllPosts({ includePages: false });
  return [...new Set(posts.map((post) => post.id).filter(Boolean))].map((slug) => ({ slug }));
}
