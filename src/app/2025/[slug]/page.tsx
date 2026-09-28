import { notFound } from 'next/navigation';
import { getPageDetail } from '@/utils/notion/getPageDetail';
import { isNotionNotFound } from '@/utils/notion/fetchNotionPage';
import PostDetailPage from '@/container/PostDetail/PostDetailPage';

export { generateMetadata } from '@/app/[slug]/page';
export const revalidate = 3600;

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let post;
  try {
    post = await getPageDetail(slug);
  } catch (error) {
    if (isNotionNotFound(error)) {
      notFound();
    }
    throw error;
  }
  if (!post) {
    notFound();
  }
  return <PostDetailPage post={post} />;
}

export { getStaticPostParams as generateStaticParams } from '@/utils/notion/getStaticPostParams';
