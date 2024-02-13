import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    inject: 'body',
    template: './static/index.html',
    title: '',
  },
  output: {
    assetPrefix: './',
    legalComments: 'none',
  }
});
