import { HaierApi, HttpError } from '@shared';
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';

import type { HaierApiConfig } from '@shared';

class UiServer extends HomebridgePluginUiServer {
  haierApi!: HaierApi;

  constructor() {
    super();

    this.onRequest('/family', this.getFamilyList.bind(this));

    this.onRequest('/device', this.getDevices.bind(this));

    this.ready();
  }

  async getFamilyList(payload: HaierApiConfig) {
    this.haierApi = new HaierApi(payload);
    try {
      const familyList = this.haierApi.getFamilyList();
      return familyList;
    } catch (error) {
      if (error instanceof HttpError) {
        throw new Error(error.retInfo);
      }
      throw error;
    }
  }

  async getDevices(payload: { familyId: string }) {
    if (!this.haierApi) {
      return Promise.resolve([]);
    }
    try {
      const devices = this.haierApi.getDevicesByFamilyId(payload.familyId);
      return devices;
    } catch (error) {
      if (error instanceof HttpError) {
        throw new Error(error.retInfo);
      }
      throw error;
    }
  }
}

(() => {
  return new UiServer();
})();
