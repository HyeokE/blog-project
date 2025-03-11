import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 필요한 경우 특정 경로 차단
      // disallow: '/private/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
