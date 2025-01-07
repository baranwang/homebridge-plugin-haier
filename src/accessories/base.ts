import type { HaierHomebridgePlatform } from '../platform';
import type { HaierPlatformAccessory } from '../types';
import type { DevDigitalModel } from '@shared';
import type { Service } from 'homebridge';

export class BaseAccessory {
  public services: Service[] = [];

  private devDigitalModelPromise?: Promise<DevDigitalModel>;

  constructor(
    readonly platform: HaierHomebridgePlatform,
    readonly accessory: HaierPlatformAccessory,
  ) {
    const { deviceInfo } = this.accessory.context;
    const { Characteristic, Service } = this.platform;
    this.accessory
      .getService(Service.AccessoryInformation)!
      .setCharacteristic(Characteristic.Manufacturer, deviceInfo.extendedInfo.brand)
      .setCharacteristic(Characteristic.Model, deviceInfo.extendedInfo.model)
      .setCharacteristic(Characteristic.SerialNumber, deviceInfo.extendedInfo.prodNo);
  }

  protected generateServices<T extends typeof Service>(services: T[]) {
    this.services = services.map(
      (service) => this.accessory.getService(service as any) || this.accessory.addService(service as any),
    );
  }

  protected get devDigitalModelPropertiesMap() {
    return Object.fromEntries(
      this.accessory.context.devDigitalModel?.attributes?.map((item) => [item.name, item]) ?? [],
    );
  }

  protected get Characteristic() {
    return this.platform.Characteristic;
  }

  protected async getDevDigitalModel() {
    const { deviceId, isOnline } = this.accessory.context.deviceInfo.baseInfo;
    if (!isOnline) {
      this.platform.log.warn('设备', this.accessory.displayName, '离线');
    }
    try {
      if (!this.devDigitalModelPromise) {
        this.devDigitalModelPromise = this.platform.haierApi.getDevDigitalModel(deviceId);
      }
      const devDigitalModel = await this.devDigitalModelPromise;
      this.accessory.context.devDigitalModel = devDigitalModel;
      this.onDevDigitalModelUpdate();
      return devDigitalModel;
    } catch (error) {
      this.platform.log.error('获取设备数据失败', error);
      return this.accessory.context.devDigitalModel;
    } finally {
      this.devDigitalModelPromise = undefined;
    }
  }

  protected async sendCommands(...commands: Record<string, unknown>[]) {
    for (const cmd of commands) {
      for (const [key, value] of Object.entries(cmd)) {
        const { valueRange, desc: commandDescription } = this.devDigitalModelPropertiesMap[key] ?? {};
        let valueDescription = value;
        if (!valueRange) {
          continue;
        }
        if (valueRange.type === 'LIST') {
          const valueItem = valueRange.dataList.find((item) => item.data === value);
          valueDescription = valueItem?.desc ?? value;
        }
        this.platform.log.info('设置', this.accessory.displayName, commandDescription, '为', valueDescription);
      }
    }
    await this.platform.haierApi.sendCommands(this.accessory.context.deviceInfo.baseInfo.deviceId, ...commands);
    await this.getDevDigitalModel();
  }

  onDevDigitalModelUpdate() {
    // 暴露给子类
  }
}
