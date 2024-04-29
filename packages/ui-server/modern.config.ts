import { moduleTools, defineConfig } from '@modern-js/module-tools';

export default defineConfig({
  plugins: [moduleTools()],
  buildConfig: {
    format: 'cjs',
    dts: false,
    input: ['src/server.ts'],
    outDir: '../plugin/homebridge-ui',
  },
});
