import type { DevDigitalModel, DeviceInfo } from '@hb-haier/shared';
import type { PlatformAccessory } from 'homebridge';

export type HaierPlatformAccessory = PlatformAccessory<HaierPlatformAccessoryContext>;

export interface HaierPlatformAccessoryContext {
  deviceInfo: DeviceInfo;
  devDigitalModel?: DevDigitalModel;
}
