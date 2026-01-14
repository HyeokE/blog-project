const nextConfig = {
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
  serverExternalPackages: [
    'notion-client',
    'notion-utils',
    'react-notion-x',
    'keyv',
    'cacheable-request',
    'got',
  ],
};

export default nextConfig;
