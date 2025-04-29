import { getAllPosts } from '@/apis/NotionService';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 기본 URL 설정
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 모든 포스트 가져오기
  const posts = await getAllPosts({ includePages: false });

  // 각 로케일에 대한 URL 생성
  let urls: MetadataRoute.Sitemap = [];

  // 먼저 기본 로케일(한국어)에 대한 URL 생성 - 루트 경로 사용
  // 루트 경로에 해당하는 한국어 URL들
  const koPostUrls = posts
    .filter((post) => post.id)
    .map((post) => ({
      url: `${baseUrl}/${post.id}`,
      lastModified: new Date(post.date?.start_date || post.createdTime),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

  // 한국어 정적 페이지 URL - 루트 경로 사용
  const koStaticUrls = [
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

  // 한국어 URL 추가
  urls = [...urls, ...koStaticUrls, ...koPostUrls];
    // 포스트 URL 생성
    const otherPostUrls = posts
      .filter((post) => post.id)
      .map((post) => ({
        url: `${baseUrl}/${post.id}`,
        lastModified: new Date(post.date?.start_date || post.createdTime),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));

    // 정적 페이지 URL
    const otherStaticUrls = [
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

    // 다른 언어 URL 추가
    urls = [...urls, ...otherStaticUrls, ...otherPostUrls];

  return urls;
}
