import { PLATFORM_NAME, PLUGIN_NAME, generateCacheDir } from '@shared';
import { type DeviceInfo, HaierIoT } from 'haier-iot';
import type { API, Characteristic, DynamicPlatformPlugin, Logger, Service } from 'homebridge';
import { AirConditionerAccessory, FridgeAccessory, WaterHeaterAccessory } from './accessories';
import type { HaierPlatformAccessory, HaierPlatformAccessoryContext, HaierPlatformConfig } from './types';

export class HaierHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;

  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  public readonly accessories: HaierPlatformAccessory[] = [];

  public haierIoT!: HaierIoT;

  constructor(
    public readonly log: Logger,
    public readonly config: HaierPlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('平台初始化完成', this.config.name);

    this.accessories = [];

    this.api.on('didFinishLaunching', async () => {
      const { username, password } = this.config;
      if (!username || !password) {
        this.log.error('请在 config.json 中配置 username 和 password');
        return;
      }
      this.haierIoT = new HaierIoT({
        username,
        password,
        storageDir: generateCacheDir(this.api.user.storagePath()),
        logger: log,
      });
      await this.haierIoT.connect();
      this.discoverDevices();
    });

    this.api.on('shutdown', () => {
      this.log.info('Homebridge 即将关闭，断开连接');
    });
  }

  configureAccessory(accessory: HaierPlatformAccessory) {
    const { disabledDevices = [] } = this.config;
    this.log.info('从缓存加载附件：', accessory.displayName);
    if (disabledDevices.includes(accessory.context.deviceInfo.baseInfo.deviceId)) {
      this.log.info('设备', accessory.displayName, '已被禁用');
      return;
    }
    this.accessories.push(accessory);
  }

  discoverDevices() {
    const { familyId } = this.config;
    if (!familyId) {
      this.log.error('请在 config.json 中配置 familyId');
      return;
    }

    this.haierIoT.getDevicesByFamilyId(familyId).then(async (devices) => {
      const resp = await Promise.allSettled(devices.map((device) => this.handleDevice(device)));
      const deviceIds = resp
        .filter((item) => item.status === 'fulfilled')
        .map((item) => item.value)
        .filter((item) => typeof item === 'string');
      if (deviceIds.length) {
        this.haierIoT.subscribeDevices(deviceIds);
      }
    });
  }

  private async handleDevice(device: DeviceInfo) {
    const { disabledDevices = [] } = this.config;

    if (disabledDevices.includes(device.baseInfo.deviceId)) {
      this.log.info('设备', device.baseInfo.deviceName, '已被禁用');
      return;
    }

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
    const { deviceId } = device.baseInfo;
    const uuid = this.api.hap.uuid.generate(deviceId);
    const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);
    if (existingAccessory) {
      this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
      existingAccessory.context = {
        deviceInfo: device,
      };
      this.api.updatePlatformAccessories([existingAccessory]);
      new AccessoryClass(this, existingAccessory);
    } else {
      const displayName = this.getDeviceName(device);
      this.log.info('Adding new accessory:', displayName);
      const accessory = new this.api.platformAccessory<HaierPlatformAccessoryContext>(displayName, uuid);
      accessory.context = {
        deviceInfo: device,
      };
      new AccessoryClass(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
    }
    return deviceId;
  }

  private isDeviceIneligible(device: DeviceInfo): boolean {
    const displayName = this.getDeviceName(device);
    if (!device.baseInfo.permission?.auth?.control) {
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
        return WaterHeaterAccessory;
      case '冰冷':
        return FridgeAccessory;
      default:
        return undefined;
    }
  }

  private getDeviceName(device: DeviceInfo) {
    return `${device.extendedInfo.room} - ${device.baseInfo.deviceName}`;
  }
}
