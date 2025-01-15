import type { HaierHomebridgePlatform } from '../platform';
import type { HaierPlatformAccessory } from '../types';
import { safeJsonParse, type DevDigitalModel, type DevDigitalModelProperty } from '@shared';
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

    this.platform.haierApi.addListener('devDigitalModelUpdate', (deviceId, devDigitalModel) => {
      if (deviceInfo.baseInfo.deviceId !== deviceId) {
        return;
      }
      this.onDevDigitalModelUpdate(devDigitalModel);
    });

    const { Characteristic, Service } = this.platform;
    this.accessory
      .getService(Service.AccessoryInformation)
      ?.setCharacteristic(Characteristic.Manufacturer, deviceInfo.extendedInfo.brand)
      .setCharacteristic(Characteristic.Model, deviceInfo.extendedInfo.model)
      .setCharacteristic(Characteristic.SerialNumber, deviceInfo.extendedInfo.prodNo);
    this.init();
  }

  abstract init(): void;

  abstract onDevDigitalModelUpdate(devDigitalModel: DevDigitalModel): void;

  protected setServices(key: string, service: typeof Service, name?: string) {
    const existingService = this.accessory.getService(key);
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

  protected get Characteristic() {
    return this.platform.Characteristic;
  }

  protected get deviceInfo() {
    return this.accessory.context.deviceInfo;
  }

  protected get devDigitalModelPropertiesMap(): Record<string, DevDigitalModelProperty | undefined> {
    return Object.fromEntries(
      this.accessory.context.devDigitalModel?.attributes?.map((item) => [item.name, item]) ?? [],
    );
  }

  protected getPropertyValue<T>(property: string, defaultValue?: T): T | null {
    return safeJsonParse<T>(this.devDigitalModelPropertiesMap[property]?.value, defaultValue);
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

      return devDigitalModel;
    } catch (error) {
      this.platform.log.error('获取设备数据失败', error);
      return this.accessory.context.devDigitalModel;
    } finally {
      this.isFetchingDevDigitalModel = false;
      this.devDigitalModelPromise = undefined;
    }
  }

  protected sendCommands(...commands: Record<string, string>[]) {
    commands.forEach((cmd) => {
      Object.entries(cmd).forEach(([key, value]) => {
        const { valueRange, desc: commandDescription } = this.devDigitalModelPropertiesMap[key] ?? {};
        let valueDescription = value;
        if (!valueRange) {
          return;
        }
        if (valueRange.type === 'LIST') {
          const valueItem = valueRange.dataList.find((item) => item.data === value);
          valueDescription = valueItem?.desc ?? value;
        }
        this.platform.log.info('设置', this.accessory.displayName, commandDescription, '为', valueDescription);
      });
    });

    this.platform.haierApi.sendCommands(this.deviceInfo.baseInfo.deviceId, ...commands);
  }
}
