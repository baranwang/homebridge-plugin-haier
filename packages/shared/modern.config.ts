import { moduleTools, defineConfig } from '@modern-js/module-tools';

import { name } from '../plugin/package.json';

export default defineConfig({
  plugins: [moduleTools()],
  buildPreset: ({ extendPreset }) =>
    extendPreset('npm-library', {
      buildType: 'bundleless',
      define: {
        'process.env.PLUGIN_NAME': name,
      },
    }),
});
