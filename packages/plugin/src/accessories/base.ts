import type { HaierHomebridgePlatform } from '../platform';
import type { HaierPlatformAccessory } from '../types';
import type { DevDigitalModel, DevDigitalModelProperty } from '@hb-haier/shared';
import type { Service } from 'homebridge';

type GenerateServicesParams =
  | typeof Service
  | {
      service: typeof Service;
      subName: string;
    };

export class BaseAccessory {
  public services: Record<string, Service> = {};

  private devDigitalModelPromise?: Promise<DevDigitalModel>;

  constructor(readonly platform: HaierHomebridgePlatform, readonly accessory: HaierPlatformAccessory) {
    const { deviceInfo } = this.accessory.context;
    const { Characteristic, Service } = this.platform;
    this.accessory
      .getService(Service.AccessoryInformation)!
      .setCharacteristic(Characteristic.Manufacturer, deviceInfo.extendedInfo.brand)
      .setCharacteristic(Characteristic.Model, deviceInfo.extendedInfo.model)
      .setCharacteristic(Characteristic.SerialNumber, deviceInfo.extendedInfo.prodNo);
    this.init();
  }

  protected generateServices(services: Record<string, GenerateServicesParams>) {
    this.services = Object.entries(services).reduce<Record<string, Service>>((acc, [key, params]) => {
      const existingService = this.accessory.getService(key);
      if (existingService) {
        acc[key] = existingService;
      } else if ('subName' in params) {
        const { subName, service } = params;
        acc[key] = this.accessory.addService(service, `${this.accessory.displayName} - ${subName}`, key);
      } else {
        acc[key] = this.accessory.addService(params, this.accessory.displayName, key);
      }
      return acc;
    }, {});
  }

  protected get deviceAttr() {
    return Object.fromEntries(this.accessory.context.devDigitalModel?.attributes?.map(item => [item.name, item]) ?? []);
  }

  protected get deviceProps() {
    const sendCommands = this.sendCommands.bind(this);
    return new Proxy(this.deviceAttr, {
      get(target, key, receiver) {
        const attr = Reflect.get(target, key, receiver) as DevDigitalModelProperty | undefined;
        return attr?.value;
      },
      set(target, key, value, receiver) {
        const attr = Reflect.get(target, key, receiver) as DevDigitalModelProperty | undefined;
        if (!attr) {
          return false;
        }
        if (!attr.writable) {
          return false;
        }
        sendCommands({ [key as string]: value });
        return true;
      },
    }) as unknown as Record<string, string>;
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
    commands.forEach(cmd => {
      Object.entries(cmd).forEach(([key, value]) => {
        const { valueRange, desc: commandDescription } = this.deviceAttr?.[key] ?? {};
        let valueDescription = value;
        if (!valueRange) {
          return;
        }
        if (valueRange.type === 'LIST') {
          const valueItem = valueRange.dataList.find(item => item.data === value);
          valueDescription = valueItem?.desc ?? value;
        }
        this.platform.log.success(
          'Set',
          `「${this.accessory.displayName}」`,
          `[${commandDescription}]`,
          '=>',
          valueDescription,
        );
      });
    });
    await this.platform.haierApi.sendCommands(this.accessory.context.deviceInfo.baseInfo.deviceId, ...commands);
    await this.getDevDigitalModel();
  }

  onDevDigitalModelUpdate() {
    // 暴露给子类
  }

  init() {
    // 暴露给子类
  }
}
