import { use } from 'react';
import { getAllPosts } from '@/apis/NotionService';
import NotionView from '@/components/NotionView';

import type { Metadata } from 'next';
import type { NotionPosts } from '@/models/NotionPosts';
import { BLOG_CONFIG } from '../../../.blog-project.config';
import * as motion from 'motion/react-client';

import { getPageDetail } from '@/utils/notion/getPageDetail';

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return <PostDetail postId={slug} />;
}

const PostDetail = ({ postId }: { postId: string }) => {
  const post = use(getPageDetail(postId));

  return (
    <article className="flex flex-col gap-6 w-full mw-[512px] px-5 mx-auto py-16">
      <motion.h1
        layoutId={post.id}
        className="text-3xl text-gray-900 font-bold w-full max-w-[712px] mx-auto"
      >
        {post.title}
      </motion.h1>

      <NotionView recordMap={post.recordMap} />
    </article>
  );
};

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
