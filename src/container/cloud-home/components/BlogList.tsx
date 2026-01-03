'use client';

import type { NotionPosts } from '@/models/NotionPosts';
import { PostCard } from './PostCard';

interface BlogListProps {
  posts: NotionPosts;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const BlogList = ({ posts }: BlogListProps) => {
  return (
    <div
      className="mx-auto flex max-w-3xl flex-col space-y-16 py-20"
      style={{ perspective: '2000px', perspectiveOrigin: '50% 50%' }}
    >
      {posts.map((post) => (
        <PostCard
          key={post.id}
          id={post.id}
          title={post.title}
          excerpt={post.summary}
          date={formatDate(post.date.start_date)}
          category={post.tags?.[0]}
          slug={post.slug}
        />
      ))}
    </div>
  );
};
