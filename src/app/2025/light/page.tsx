import type { Metadata } from 'next';
import { getAllPosts } from '@/apis/NotionService';
import LightWall from '@/container/light-wall/LightWall';

export const metadata: Metadata = {
  title: 'Light / HYEOK.DEV',
  robots: { index: false, follow: false },
};

export default async function LightWallPage() {
  const posts = await getAllPosts({ includePages: false });
  return (
    <LightWall
      posts={posts.filter(
        (post) => !post.tags?.some((tag) => tag.toLowerCase().includes('personal')),
      )}
    />
  );
}

export const revalidate = 3600;
