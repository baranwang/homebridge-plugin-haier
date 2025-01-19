import { safeJsonParse } from '@shared';
import type { CommandParams, DevDigitalModel, DevDigitalModelProperty, DeviceInfo } from 'haier-iot';
import type { Service } from 'homebridge';
import type { HaierHomebridgePlatform } from '../platform';
import type { HaierPlatformAccessory } from '../types';

export abstract class BaseAccessory {
  public services: Record<string, Service> = {};

  private devDigitalModelPromise?: Promise<DevDigitalModel | undefined>;

  private isFetchingDevDigitalModel = false;

  constructor(
    readonly platform: HaierHomebridgePlatform,
    readonly accessory: HaierPlatformAccessory,
  ) {
    this.initializeAccessory().catch((error) =>
      this.platform.log.error(`初始化设备 ${this.accessory.displayName} 时出错:`, error),
    );
  }

  abstract init(): void;

  abstract onDevDigitalModelUpdate(): void;

  /** 初始化设备信息及监听器 */
  private async initializeAccessory() {
    await this.getDevDigitalModel();

    const { deviceInfo } = this.accessory.context;
    this.setupListeners(deviceInfo.baseInfo.deviceId);
    this.setupAccessoryInformation(deviceInfo);
    this.init();
  }

  /** 设置设备监听器 */
  private setupListeners(deviceId: string) {
    this.platform.haierIoT.addListener('devDigitalModelUpdate', (updatedDeviceId, devDigitalModel) => {
      if (deviceId !== updatedDeviceId) return;

      this.accessory.context.devDigitalModel = devDigitalModel;
      this.onDevDigitalModelUpdate();
    });
  }

  /** 设置设备基本信息 */
  private setupAccessoryInformation(deviceInfo: DeviceInfo) {
    const { Characteristic, Service } = this.platform;
    this.accessory
      .getService(Service.AccessoryInformation)
      ?.setCharacteristic(Characteristic.Manufacturer, deviceInfo.extendedInfo.brand)
      .setCharacteristic(Characteristic.Model, deviceInfo.extendedInfo.model)
      .setCharacteristic(Characteristic.SerialNumber, deviceInfo.extendedInfo.prodNo);
  }

  protected setServices<T extends typeof Service>(key: string, service: T, name?: string) {
    const existingService = this.accessory.getService(key);
    if (existingService) {
      this.services[key] = existingService;
      return existingService as InstanceType<T>;
    }
    let serviceName = this.accessory.displayName;
    if (name) {
      serviceName += ` - ${name}`;
    }
    const newService = this.accessory.addService(service as typeof Service, serviceName, key);
    newService.setCharacteristic(this.Characteristic.Name, serviceName);
    this.services[key] = newService;
    return newService as InstanceType<T>;
  }

  protected get Characteristic() {
    return this.platform.Characteristic;
  }

  protected get deviceInfo() {
    return this.accessory.context.deviceInfo;
  }

  protected get deviceProperties(): Record<string, DevDigitalModelProperty | undefined> {
    const attributes = this.accessory.context.devDigitalModel?.attributes ?? [];
    return Object.fromEntries(attributes.map((item) => [item.name, item]));
  }

  protected getPropertyValue<T>(property: string, defaultValue?: T): T | null {
    return safeJsonParse<T>(this.deviceProperties?.[property]?.value ?? undefined, defaultValue);
  }

  private async getDevDigitalModel() {
    const { deviceId, isOnline } = this.deviceInfo.baseInfo;

    if (!isOnline) {
      this.platform.log.warn(`设备 ${this.accessory.displayName} 离线`);
      return null;
    }

    if (this.isFetchingDevDigitalModel) {
      return this.devDigitalModelPromise ?? this.accessory.context.devDigitalModel;
    }

    this.isFetchingDevDigitalModel = true;

    try {
      this.devDigitalModelPromise ??= this.platform.haierIoT.getDevDigitalModel(deviceId);
      const devDigitalModel = await this.devDigitalModelPromise;

      if (!devDigitalModel) {
        this.platform.log.error(`设备 ${this.accessory.displayName} 的数据为空`);
        return null;
      }

      this.accessory.context.devDigitalModel = { ...devDigitalModel };
      return devDigitalModel;
    } catch (error) {
      this.platform.log.error(`获取设备 ${this.accessory.displayName} 数据失败`, error);
      return this.accessory.context.devDigitalModel;
    } finally {
      this.isFetchingDevDigitalModel = false;
      this.devDigitalModelPromise = undefined;
    }
  }

  protected async sendCommands(...commands: CommandParams[]) {
    commands.forEach((cmd) => {
      Object.entries(cmd).forEach(([key, value]) => {
        const { valueRange, desc: commandDescription } = this.deviceProperties[key] ?? {};
        let valueDescription = value;
        if (!valueRange) {
          return;
        }
        if (valueRange.type === 'LIST') {
          const valueItem = valueRange.dataList?.find((item) => item.data === value);
          valueDescription = valueItem?.desc ?? value;
        }
        this.platform.log.info('设置', this.accessory.displayName, '的', commandDescription, '为', valueDescription);
      });
    });

    await this.platform.haierIoT.sendCommands(this.deviceInfo.baseInfo.deviceId, commands);
    this.onDevDigitalModelUpdate();
  }
}
