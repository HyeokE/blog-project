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
    config.plugins.unshift({name:'wwm-isolated-transports',enforce:'pre',resolveId(id,importer){
      if(!importer?.includes('/features/when-we-meet/')){return;}
      const transports:Record<string,string>={'./api':'mock-api.ts','./date-api':'mock-date-api.ts','./date-confirmation-api':'mock-date-confirmation-api.ts'};
      if(Object.hasOwn(transports,id)){return path.resolve('src/stories/wwm',transports[id]);}
    }});
    // App code imports JSON with the standard `with {type:'json'}` (required by Node, accepted by Next). The Next SWC
    // plugin used here re-emits it as the legacy `assert {…}`, which browsers reject. Vite serves `.json` imports as JS
    // modules and needs no attribute, so drop it before SWC runs (this plugin is first among the `pre` plugins).
    config.plugins.unshift({name:'wwm-json-import-attributes',enforce:'pre',transform(code,id){
      if(id.includes('/node_modules/')||!/\.m?[jt]sx?$/.test(id.split('?')[0])||!/\bwith\s*\{\s*type\s*:\s*['"]json['"]\s*\}/.test(code))return;
      return {code:code.replace(/(\bfrom\s*['"][^'"]+\.json['"])\s*with\s*\{\s*type\s*:\s*['"]json['"]\s*\}/g,'$1'),map:null};
    }});
    config.resolve ??= {};
    config.resolve.alias = [
      {find: /^@\/features\/when-we-meet\/date-api$/, replacement: path.resolve('src/stories/wwm/mock-date-api.ts')},
      {find: /^@\/features\/when-we-meet\/date-confirmation-api$/, replacement: path.resolve('src/stories/wwm/mock-date-confirmation-api.ts')},
      {find: '@/features/when-we-meet/api', replacement: path.resolve('src/stories/wwm/mock-api.ts')},
      {find: '@/app/craft/CraftAccount', replacement: path.resolve('src/stories/wwm/mock-account.tsx')},
      ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : Object.entries(config.resolve.alias ?? {}).map(([find,replacement]) => ({find,replacement}))),
    ];
    return config;
  },
};
export default config;
