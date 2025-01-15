import type { HaierHomebridgePlatform } from '../platform';
import type { HaierPlatformAccessory } from '../types';
import type { DevDigitalModel } from '@shared';
import type { Service } from 'homebridge';

export abstract class BaseAccessory {
  public services: Record<string, Service> = {};

  private devDigitalModelPromise?: Promise<DevDigitalModel | null>;

  private isFetchingDevDigitalModel = false;

  constructor(
    readonly platform: HaierHomebridgePlatform,
    readonly accessory: HaierPlatformAccessory,
  ) {
    const { deviceInfo } = this.accessory.context;
    const { Characteristic, Service } = this.platform;
    this.accessory
      .getService(Service.AccessoryInformation)?.setCharacteristic(Characteristic.Manufacturer, deviceInfo.extendedInfo.brand)
      .setCharacteristic(Characteristic.Model, deviceInfo.extendedInfo.model)
      .setCharacteristic(Characteristic.SerialNumber, deviceInfo.extendedInfo.prodNo);
    this.init();
  }

  abstract init(): void;

  abstract onDevDigitalModelUpdate(): void;

  protected setServices(key: string, service: typeof Service, name?: string) {
    const existingService = this.accessory.getService(key)
    if (existingService) {
      this.services[key] = existingService;
    } else {
      let serviceName = this.accessory.displayName;
      if (name) {
        serviceName += ` - ${name}`;
      }
      this.services[key] = this.accessory.addService(service, serviceName, key);
    }
  }

  protected get deviceInfo() {
    return this.accessory.context.deviceInfo;
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
    const { deviceId, isOnline } = this.deviceInfo.baseInfo;
    if (!isOnline) {
      this.platform.log.warn('设备', this.accessory.displayName, '离线');
    }

    if (this.isFetchingDevDigitalModel) {
      return this.devDigitalModelPromise ?? this.accessory.context.devDigitalModel;
    }

    this.isFetchingDevDigitalModel = true;

    try {
      if (!this.devDigitalModelPromise) {
        this.devDigitalModelPromise = this.platform.haierApi.getDevDigitalModel(deviceId);
      }
      const devDigitalModel = await this.devDigitalModelPromise;
      if (!devDigitalModel) {
        this.platform.log.error('设备数据为空', this.accessory.displayName);
        return null;
      }
      this.accessory.context.devDigitalModel = devDigitalModel;
      this.onDevDigitalModelUpdate();
      return devDigitalModel;
    } catch (error) {
      this.platform.log.error('获取设备数据失败', error);
      return this.accessory.context.devDigitalModel;
    } finally {
      this.isFetchingDevDigitalModel = false;
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
    const resp = await this.platform.haierApi.sendCommands(this.accessory.context.deviceInfo.baseInfo.deviceId, ...commands);
    await this.getDevDigitalModel();
    return resp;
  }
}
