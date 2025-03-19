const nextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
  i18n: {
    locales: ['en', 'ko'],
    defaultLocale: 'ko',
    localeDetection: true,
  },
};

export default nextConfig;
