import { getAllPosts } from '@/apis/NotionService';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 기본 URL 설정
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 모든 포스트 가져오기
  const posts = await getAllPosts({ includePages: false });

  // 포스트 URL 생성
  const postUrls = posts
    .filter((post) => post.id)
    .map((post) => ({
      url: `${baseUrl}/${post.id}`,
      lastModified: new Date(post.date?.start_date || post.createdTime),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  // 정적 페이지 URL
  const staticUrls = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/gallery`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
  ];

  // 모든 URL 합치기
  return [...staticUrls, ...postUrls];
}
