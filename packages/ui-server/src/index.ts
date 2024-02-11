import { HaierApi } from '@hb-haier/shared';
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

import type { HaierApiConfig } from '@hb-haier/shared';

class UiServer extends HomebridgePluginUiServer {
  constructor() {
    super();

    this.onRequest('/family/list', this.getFamilyList.bind(this));

    this.ready();
  }

  async getFamilyList(payload: HaierApiConfig) {
    const haierApi = new HaierApi(payload);
    const familyList = haierApi.getFamilyList();
    return familyList;
  }
}

(() => {
  return new UiServer();
})();
