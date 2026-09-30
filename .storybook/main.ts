import type { StorybookConfig } from '@storybook/nextjs-vite';
import path from 'node:path';
const config: StorybookConfig = {
  stories: ['../src/stories/wwm/**/*.stories.tsx'],
  core: {allowedHosts: ['macmini-home.taile6a871.ts.net']},
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  framework: {name: '@storybook/nextjs-vite', options: {}},
  staticDirs: ['../public'],
  viteFinal: async config => {
    config.define = {...config.define, 'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify('https://storybook.invalid'), 'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify('storybook-public-synthetic')};
    config.envDir = path.resolve('.storybook/synthetic-env');
    config.server = {...config.server, allowedHosts: ['macmini-home.taile6a871.ts.net']};
    config.plugins ??= [];
    config.plugins.unshift({name:'wwm-isolated-transports',enforce:'pre',resolveId(id,importer){if(importer?.includes('/features/when-we-meet/')&&id==='./api')return path.resolve('src/stories/wwm/mock-api.ts');}});
    config.resolve ??= {};
    config.resolve.alias = [
      {find: '@/features/when-we-meet/api', replacement: path.resolve('src/stories/wwm/mock-api.ts')},
      {find: '@/app/craft/CraftAccount', replacement: path.resolve('src/stories/wwm/mock-account.tsx')},
      ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : Object.entries(config.resolve.alias ?? {}).map(([find,replacement]) => ({find,replacement}))),
    ];
    return config;
  },
};
export default config;
