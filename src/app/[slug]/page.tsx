import { getAllPosts } from '@/apis/NotionService';

import type { Metadata } from 'next';
import type { NotionPosts } from '@/models/NotionPosts';
import { parseISO, format } from 'date-fns';
import { ko } from 'date-fns/locale';

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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const title = properties.title || 'Default Title';
    const description = properties.summary || 'Default Description';

    // Build /api/og URL with params (Festy-style)
    const apiOg = new URL('/api/og', siteUrl).toString();
    
    const startDate = properties.date?.start_date;
    const dateStr = startDate
      ? format(parseISO(startDate), 'yyyy.MM.dd(eee)', { locale: ko })
      : '';
    const searchparams = {
      header: 'HYEOK.DEV',
      title,
    
      date: dateStr,
    } as const;
    const ogImageUrl = `${apiOg}?${new URLSearchParams(searchparams).toString()}`;
    
    return {
      title,
      description,
      metadataBase: new URL(siteUrl),
      openGraph: {
        title,
        description,
        url: new URL(`/${id}`, siteUrl).toString(),
        type: 'article',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
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
