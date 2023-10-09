/**
 * @type {import('@rspack/cli').Configuration}
 */
module.exports = {
  context: __dirname,
  entry: {
    main: './src/main.tsx',
  },
  output: {
    clean: true,
  },
  builtins: {
    html: [
      {
        template: './index.html',
      },
    ],
    pluginImport: [
      {
        libraryName: 'ahooks',
        libraryDirectory: 'es',
        camelToDashComponentName: false,
      },
      {
        libraryName: 'react-bootstrap',
        libraryDirectory: 'esm',
        camelToDashComponentName: false,
      }
    ],
  },
};
