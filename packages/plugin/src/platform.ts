import { HaierApi } from '@hb-haier/api';
import { PLATFORM_NAME, PLUGIN_NAME } from '@hb-haier/shared';

import { AirConditionerAccessory } from './accessories';

import type { HaierPlatformAccessory, HaierPlatformAccessoryContext } from './types';
import type { DeviceInfo, HaierApiConfig } from '@hb-haier/api';
import type { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformConfig, Service } from 'homebridge';

export class HaierHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;

  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: HaierPlatformAccessory[] = [];

  public haierApi!: HaierApi;

  constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.haierApi = new HaierApi(config as unknown as HaierApiConfig);
      this.haierApi.getWssUrl();
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: HaierPlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

  getAccessoryClass(deviceInfo: DeviceInfo) {
    switch (deviceInfo.extendedInfo.categoryGrouping) {
      case '空调':
        return AirConditionerAccessory;

      default:
        return undefined;
    }
  }

  async discoverDevices() {
    const { familyId } = this.config;
    if (!familyId) {
      this.log.error('Please set familyId in config.json');
      return;
    }
    const devices = await this.haierApi.getDevicesByFamilyId(familyId);
    for (const device of devices) {
      if (!device.baseInfo.permission.auth.control) {
        this.log.warn('Device', device.baseInfo.deviceName, 'does not have control permission');
        continue;
      }
      if (!device.extendedInfo.bindType) {
        this.log.warn('Device', device.baseInfo.deviceName, 'does not support control via cloud');
        continue;
      }
      const AccessoryClass = this.getAccessoryClass(device);
      if (!AccessoryClass) {
        this.log.warn('Device', device.baseInfo.deviceName, 'does not have a corresponding accessory class');
        continue;
      }
      const uuid = this.api.hap.uuid.generate(device.baseInfo.deviceId);
      const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        existingAccessory.context = {
          deviceInfo: device,
        };
        this.api.updatePlatformAccessories([existingAccessory]);
        new AccessoryClass(this, existingAccessory);
      } else {
        this.log.info('Adding new accessory:', device.baseInfo.deviceName);
        const accessory = new this.api.platformAccessory<HaierPlatformAccessoryContext>(
          device.baseInfo.deviceName,
          uuid,
        );
        accessory.context = {
          deviceInfo: device,
        };
        new AccessoryClass(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      }
    }
  }
}
