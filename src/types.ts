import type { DevDigitalModel, DeviceInfo } from 'haier-iot';
import type { PlatformAccessory } from 'homebridge';

export type HaierPlatformAccessory = PlatformAccessory<HaierPlatformAccessoryContext>;

export interface HaierPlatformAccessoryContext {
  deviceInfo: DeviceInfo;
  devDigitalModel?: DevDigitalModel;
}
