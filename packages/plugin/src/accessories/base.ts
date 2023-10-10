import type { HaierHomebridgePlatform } from '../platform';
import type { HaierPlatformAccessory } from '../types';
import type { Service } from 'homebridge';

export class BaseAccessories {
  public services: Service[] = [];

  constructor(readonly platform: HaierHomebridgePlatform, readonly accessory: HaierPlatformAccessory) {
    this.accessory
      .getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, this.accessory.context.extendedInfo.brand)
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.context.extendedInfo.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.context.extendedInfo.prodNo);
  }

  generateServices<T extends typeof Service>(services: T[]) {
    this.services = services.map(
      service => this.accessory.getService(service as any) || this.accessory.addService(service as any),
    );
  }
}
