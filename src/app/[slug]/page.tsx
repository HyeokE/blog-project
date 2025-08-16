import { getAllPosts } from '@/apis/NotionService';

import type { Metadata } from 'next';
import type { NotionPosts } from '@/models/NotionPosts';

import { getPageDetail } from '@/utils/notion/getPageDetail';
import PostDetailPage from '@/container/PostDetail/PostDetailPage';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPageDetail(slug);

  return <PostDetailPage post={post} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: id } = await params;
  const properties = await getPageDetail(id);

  return {
    title: properties.title || 'Default Title',
    description: properties.summary || 'Default Description',

    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'), // 기본 URL 설정
  };
}
export const dynamic = 'force-static';
export const revalidate = 3600;

export async function generateStaticParams() {
  const posts: NotionPosts = await getAllPosts({
    includePages: false,
  });

  return posts
    .filter((post) => post.id) // id가 있는 post만 포함
    .map((post) => ({
      slug: String(post.id),
    }));
}
