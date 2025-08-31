import { getAllPosts } from '@/apis/NotionService';

import type { Metadata } from 'next';
import type { NotionPosts } from '@/models/NotionPosts';

import { getPageDetail } from '@/utils/notion/getPageDetail';
import PostDetailPage from '@/container/PostDetail/PostDetailPage';
import { notFound } from 'next/navigation';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const post = await getPageDetail(slug);
    if (!post) {
      notFound();
    }
    return <PostDetailPage post={post} />;
  } catch (_error: unknown) {
    notFound();
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  try {
    const { slug: id } = await params;
    const properties = await getPageDetail(id);
    return {
      title: properties.title || 'Default Title',
      description: properties.summary || 'Default Description',
      metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    };
  } catch {
    // 페이지가 존재하지 않으면 404로 처리되므로, 메타데이터는 최소값으로 반환
    return {
      title: 'Not Found',
      description: 'The requested post could not be found.',
      metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
    };
  }
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
