import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

class UiServer extends HomebridgePluginUiServer {}

(() => {
  return new UiServer();
})();
