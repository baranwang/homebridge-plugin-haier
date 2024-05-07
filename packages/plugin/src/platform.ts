import { HaierApi } from '@hb-haier/shared';
import { PLATFORM_NAME, PLUGIN_NAME } from '@hb-haier/shared/constants';

import { AirConditionerAccessory, HotWaterAccessory } from './accessories';

import type { HaierPlatformAccessory, HaierPlatformAccessoryContext } from './types';
import type { DeviceInfo, HaierApiConfig } from '@hb-haier/shared';
import type { API, Characteristic, DynamicPlatformPlugin, Logger, PlatformConfig, Service } from 'homebridge';

export class HaierHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;

  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: HaierPlatformAccessory[] = [];

  public haierApi!: HaierApi;

  constructor(public readonly log: Logger, public readonly config: PlatformConfig, public readonly api: API) {
    this.log.debug('平台初始化完成', this.config.name);

    this.api.on('didFinishLaunching', () => {
      this.log.debug('Executed didFinishLaunching callback');
      this.haierApi = new HaierApi(config as unknown as HaierApiConfig, api, log);
      this.discoverDevices();
    });

    this.api.on('shutdown', () => {
      this.log.debug('Executed shutdown callback');
    });
  }

  configureAccessory(accessory: HaierPlatformAccessory) {
    this.log.info('从缓存加载附件：', accessory.displayName);
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const { familyId, disabledDevices = [] } = this.config;
    if (!familyId) {
      this.log.error('请在 config.json 中配置 familyId');
      return;
    }

    this.haierApi.getDevicesByFamilyId(familyId).then(devices => {
      devices.forEach(device => {
        if (!disabledDevices.includes(device.baseInfo.deviceId)) {
          this.handleDevice(device);
        }
      });
    });
  }

  private handleDevice(device: DeviceInfo) {
    if (this.isDeviceIneligible(device)) {
      return;
    }

    const AccessoryClass = this.getAccessoryClass(device);
    if (!AccessoryClass) {
      this.log.warn(
        '设备',
        device.baseInfo.deviceName,
        '暂不支持，可提交 issue 申请支持',
        require('../package.json').bugs.url,
      );
      return;
    }
    const uuid = this.api.hap.uuid.generate(device.baseInfo.deviceId);
    const existingAccessory = this.accessories.find(accessory => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('从缓存加载附件：', existingAccessory.displayName);
      existingAccessory.context = {
        deviceInfo: device,
      };
      this.api.updatePlatformAccessories([existingAccessory]);
      new AccessoryClass(this, existingAccessory);
    } else {
      const displayName = this.getDeviceName(device);
      this.log.info('添加附件：', displayName);
      const accessory = new this.api.platformAccessory<HaierPlatformAccessoryContext>(displayName, uuid);
      accessory.context = {
        deviceInfo: device,
      };
      new AccessoryClass(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
  }

  private isDeviceIneligible(device: DeviceInfo): boolean {
    const displayName = this.getDeviceName(device);
    if (!device.baseInfo.permission.auth.control) {
      this.log.warn('设备', displayName, '没有控制权限');
      return true;
    }
    if (!device.extendedInfo.bindType) {
      this.log.warn('设备', displayName, '不支持云端控制');
      return true;
    }
    return false;
  }

  private getAccessoryClass(deviceInfo: DeviceInfo) {
    switch (deviceInfo.extendedInfo.categoryGrouping) {
      case '空调':
        return AirConditionerAccessory;

      case '热水卫浴':
        return HotWaterAccessory;

      default:
        return undefined;
    }
  }

  private getDeviceName(device: DeviceInfo) {
    return `${device.extendedInfo.room} - ${device.baseInfo.deviceName}`;
  }
}
