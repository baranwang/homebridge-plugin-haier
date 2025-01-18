import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import { generateCacheDir } from '@shared';
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
    const familyList = this.haierIoT.getFamilyList();
    return familyList;
  }

  async getDevices(payload: { familyId: string }) {
    if (!this.haierIoT) {
      return Promise.resolve([]);
    }
    const devices = this.haierIoT.getDevicesByFamilyId(payload.familyId);
    return devices;
  }
}

(() => {
  return new UiServer();
})();
