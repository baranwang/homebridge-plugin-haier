const fs = require('fs');
const path = require('path');

const pluginPath = path.resolve(__dirname, '../');
const uiPath = path.resolve(pluginPath, 'homebridge-ui');
const rendererPath = path.resolve(path.dirname(require.resolve('@hb-haier/ui-renderer/package.json')), 'dist');
const serverPath = path.resolve(
  path.dirname(require.resolve('@hb-haier/ui-server/package.json')),
  require('@hb-haier/ui-server/package.json').main,
);

if (!fs.existsSync(uiPath)) {
  fs.mkdirSync(path.resolve(pluginPath, 'homebridge-ui'));
}

const rendererDistPath = path.resolve(uiPath, 'public');
if (!fs.existsSync(rendererDistPath)) {
  fs.symlinkSync(rendererPath, rendererDistPath, 'dir');
}

const serverDistPath = path.resolve(uiPath, 'server.js');
if (!fs.existsSync(serverDistPath)) {
  fs.symlinkSync(serverPath, serverDistPath);
}
