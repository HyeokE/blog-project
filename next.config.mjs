export const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['macmini-home.taile6a871.ts.net'],
  images: { qualities: [75, 92] },
  headers() {
    return [
      // Every response: no framing (Google sign-in lives here), no MIME sniffing, a stated referrer policy, and no
      // powerful browser features. A full script/style CSP is deliberately not set: the site relies on inline
      // bootstrap scripts, Google Analytics and Notion embeds, so a strict policy needs its own rollout.
      { source: '/:path*', headers: SECURITY_HEADERS },
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
