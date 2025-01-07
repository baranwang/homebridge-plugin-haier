import { execSync } from 'node:child_process';
import type { RsbuildPlugin } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig, type LibConfig } from '@rslib/core';
import pkg from './package.json';

const pluginDevServer = (): RsbuildPlugin => {
  return {
    name: 'homebridge-dev-server',
    setup: (api) => {
      api.onAfterBuild(({ isWatch }) => {
        if (isWatch) {
          execSync('npm link', { cwd: api.context.rootPath });
          execSync('nodemon', { stdio: 'inherit', cwd: api.context.rootPath });
        }
      });
    },
  };
};

const NODE_ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const pluginShared: LibConfig = {
  syntax: 'es2021',
  source: {
    entry: {
      index: './src/index.ts',
      shared: './src/shared/index.ts',
    },
  },
};

export default defineConfig({
  mode: NODE_ENV,
  lib: [
    // plugin
    {
      ...pluginShared,
      id: 'plugin-esm',
      format: 'esm',
      shims: {
        esm: {
          __dirname: true,
        },
      }
    },
    {
      ...pluginShared,
      id: 'plugin-cjs',
      format: 'cjs',
    },
    // ui
    {
      id: 'ui-renderer',
      format: 'umd',
      autoExtension: false,
      plugins: [pluginReact()],
      source: {
        entry: {
          index: './src-ui/index.tsx',
        },
      },
      output: {
        target: 'web',
        minify: true,
        filename: {
          js: '[name].[contenthash:8].js',
        },
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
    },
    {
      id: 'ui-server',
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
  output: {
    externals: {
      '@shared': `${pkg.name}/shared`,
    },
  },
  source: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
    },
  },
  // plugins: [pluginDevServer()],
});
