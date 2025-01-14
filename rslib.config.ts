import { pluginReact } from '@rsbuild/plugin-react';
import { defineConfig, type LibConfig } from '@rslib/core';
import pkg from './package.json';
import { RsdoctorRspackPlugin } from '@rsdoctor/rspack-plugin';


const NODE_ENV = process.env.NODE_ENV === 'production' ? 'production' : 'development';

const commonLibConfig: LibConfig = {
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
    // ESM Plugin Configuration
    {
      ...commonLibConfig,
      id: 'plugin-esm',
      format: 'esm',
      shims: {
        esm: {
          __dirname: true,
        },
      }
    },
    // CJS Plugin Configuration
    {
      ...commonLibConfig,
      id: 'plugin-cjs',
      format: 'cjs',
    },
    // UI Renderer Configuration
    {
      id: 'ui-renderer',
      format: 'umd',
      autoExtension: false,
      plugins: [pluginReact(),],
      source: {
        entry: {
          index: './src-ui/index.tsx',
        },
      },
      output: {
        target: 'web',
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
    // UI Server Configuration
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
    minify: NODE_ENV === 'production',
    externals: {
      '@shared': `${pkg.name}/shared`,
    },
  },
  source: {
    define: {
      'process.env.NODE_ENV': JSON.stringify(NODE_ENV),
    },
  },
  tools: {
    bundlerChain: (chain) => {
      if (process.env.ANALYSIS === 'true') {
        chain.plugin('Rsdoctor').use(RsdoctorRspackPlugin, [
          {
            supports: {
              generateTileGraph: true
            }
          },
        ]);
      }
    },
  }
});
