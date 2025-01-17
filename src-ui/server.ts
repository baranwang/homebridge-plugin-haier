import {  generateCacheDir, HttpError } from '@shared';
import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import { HaierIoT } from 'haier-iot';

class UiServer extends HomebridgePluginUiServer {
  private haierIoT!: HaierIoT;

  constructor() {
    super();

    this.onRequest('/family', this.getFamilyList.bind(this));

    this.onRequest('/device', this.getDevices.bind(this));

    this.ready();
  }

  async getFamilyList(payload: { username: string; password: string }) {
    this.haierIoT = new HaierIoT({
      username: payload.username,
      password: payload.password,
      storageDir: generateCacheDir(this.homebridgeStoragePath ?? ''),
    });
    try {
      const familyList = this.haierIoT.getFamilyList();
      return familyList;
    } catch (error) {
      if (error instanceof HttpError) {
        throw new Error(error.retInfo);
      }
      throw error;
    }
  }

  async getDevices(payload: { familyId: string }) {
    if (!this.haierIoT) {
      return Promise.resolve([]);
    }
    try {
      const devices = this.haierIoT.getDevicesByFamilyId(payload.familyId);
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
