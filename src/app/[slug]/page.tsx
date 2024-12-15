import { getAllPosts } from '@/apis/NotionService';

import type { Metadata } from 'next';
import type { NotionPosts } from '@/models/NotionPosts';
import { BLOG_CONFIG } from '../../../.blog-project.config';

import { getPageDetail } from '@/utils/notion/getPageDetail';
import PostDetailPage from '@/container/PostDetail/PostDetailPage';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPageDetail(slug);

  return <PostDetailPage post={post} />;
}

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(
  { params }: Props,
  // parent: ResolvingMetadata,
): Promise<Metadata> {
  const id = (await params).slug;

  const properties = await getPageDetail(id);

  const image = await fetch(`${BLOG_CONFIG.ORIGIN_URL}/api/og?title=${properties.title}`);

  return {
    title: properties?.title,
    openGraph: {
      images: [image],
    },
  };
}

export const revalidate = 60;

export const dynamicParams = true; // or false, to 404 on unknown paths

export async function generateStaticParams() {
  const posts: NotionPosts = await getAllPosts({
    includePages: false,
  });
  return posts.map((post) => ({
    id: String(post.id),
  }));
}
