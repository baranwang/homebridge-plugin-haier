import type { DevDigitalModel, DeviceInfo } from 'haier-iot';
import type { PlatformAccessory, PlatformConfig } from 'homebridge';

export type HaierPlatformAccessory = PlatformAccessory<HaierPlatformAccessoryContext>;

export interface HaierPlatformAccessoryContext {
  deviceInfo: DeviceInfo;
  devDigitalModel?: DevDigitalModel;
}

export interface HaierPlatformConfig extends PlatformConfig {
  username: string;
  password: string;
  familyId: string;
  disabledDevices?: string[];
  customConfig?: {
    hotWater?: {
      zeroColdWaterMode?: '1' | '2' | '3' | '4' | '10';
    };
  };
}
