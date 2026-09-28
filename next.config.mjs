/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { qualities: [75, 92] },
  headers() {
    return [
      {
        source: '/_gallery/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  experimental: {
    // Notion's API is shared by all themed routes; avoid worker request bursts.
    staticGenerationMaxConcurrency: 2,
    staticGenerationMinPagesPerWorker: 1000,
  },
  serverExternalPackages: [
    'canvas',
    'notion-client',
    'notion-utils',
    'keyv',
    'cacheable-request',
    'got',
  ],
};

export default nextConfig;
