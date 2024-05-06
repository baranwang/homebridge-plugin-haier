import { PLATFORM_NAME } from '@hb-haier/shared/constants';

import { HaierHomebridgePlatform } from './platform';

import type { API } from 'homebridge';

/**
 * This method registers the platform with Homebridge
 */
export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, HaierHomebridgePlatform);
};
