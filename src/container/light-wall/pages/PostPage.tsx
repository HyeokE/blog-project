import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import NotionView from '@/components/NotionView';
import type { PostDetailResponse } from '@/utils/notion/getPageDetail';
import WallPageShell from '../WallPageShell';

export default function PostPage({ post }: { post: PostDetailResponse }) {
  const date = post.date?.start_date;
  return (
    <WallPageShell className="wall-post-page">
      <article className="wall-reading">
        <Link href="/" className="wall-page-back" aria-label="글 목록으로 돌아가기">
          <ArrowLeft size={14} aria-hidden="true" /> ALL POSTS
        </Link>
        <header className="wall-article-header">
          <div className="wall-page-eyebrow">
            {date && <time dateTime={date}>{date.split('T')[0].replaceAll('-', '.')}</time>}
            {(post.tags?.length ?? 0) > 0 && <span>{post.tags?.join(' / ')}</span>}
          </div>
          <h1>{post.title}</h1>
        </header>
        <div className="wall-notion">
          <NotionView recordMap={post.recordMap} />
        </div>
        <Link href="/" className="wall-page-back wall-article-end">
          <ArrowLeft size={14} /> 다른 기록 읽기
        </Link>
      </article>
    </WallPageShell>
  );
}
