import { execSync } from 'node:child_process';
import type { RsbuildPlugin } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig } from '@rslib/core';

const pluginDevServer = (): RsbuildPlugin => {
  return {
    name: 'homebridge-dev-server',
    setup: (api) => {
      api.onAfterBuild(({ isWatch }) => {
        if (isWatch) {
          execSync('npm link', { cwd: api.context.rootPath })
          execSync('nodemon', { stdio: 'inherit', cwd: api.context.rootPath });
        }
      });
    },
  };
};

const NODE_ENV =
  process.env.NODE_ENV === 'production' ? 'production' : 'development';

export default defineConfig({
  mode: NODE_ENV,
  lib: [
    // plugin
    {
      id: 'homebridge-plugin-esm',
      format: 'esm',
      syntax: 'es2021',
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
    },
    {
      id: 'homebridge-plugin-cjs',
      format: 'cjs',
      syntax: 'es2021',
      source: {
        entry: {
          index: './src/index.ts',
        },
      },
    },
    // ui
    {
      id: 'homebridge-ui-renderer',
      format: 'esm',
      plugins: [pluginReact()],
      source: {
        entry: {
          index: './src-ui/index.tsx',
        },
      },
      output: {
        target: 'web',
        minify: true,
        assetPrefix: '.',
        legalComments: 'none',
        distPath: {
          root: 'homebridge-ui/public',
        },
      },
      html: {
        template: './src-ui/index.html',
        inject: 'body',
        title: '',
        meta: {
          charset: false,
          viewport: false,
        },
      },
      tools: {
        htmlPlugin: true,
      },
      performance: {
        chunkSplit: {
          strategy: 'split-by-experience',
          override: {
            cacheGroups: {
              react: {
                test: /node_modules[\\/](?:react|react-dom|scheduler|react-refresh|@rspack[\\/]plugin-react-refresh)[\\/]/,
                name: 'lib-react',
                chunks: 'all',
              },
            },
          },
        },
      },
    },
    {
      id: 'homebridge-ui-server',
      format: 'esm',
      source: {
        entry: {
          server: './src-ui/server.ts',
        },
      },
      output: {
        distPath: {
          root: 'homebridge-ui',
        },
      },
    },
  ],
  source: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
    },
  },
  plugins: [pluginDevServer()],
});
